import bcrypt from "bcryptjs";
import express from "express";
import { z } from "zod";
import { formatMysqlDateTime, query, queryOne, withTransaction } from "../db/helpers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";
import { assertYoutubeUrl } from "../utils/youtube.js";

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional().default(""),
  status: z.string().optional().default(""),
  materialId: z.coerce.number().int().positive().optional()
});

const registrationSettingSchema = z.object({
  registrationOpenAt: z.string().datetime(),
  registrationCloseAt: z.string().datetime()
}).refine(
  (value) => new Date(value.registrationCloseAt) > new Date(value.registrationOpenAt),
  { message: "Waktu tutup harus setelah waktu buka", path: ["registrationCloseAt"] }
);

const cohortSchema = z.object({
  name: z.string().min(2),
  admissionYear: z.number().int().min(2000),
  status: z.enum(["active", "archived"]).default("active")
});

const classSchema = z.object({
  name: z.string().min(2),
  cohortId: z.number().int().positive(),
  description: z.string().max(500).optional().default(""),
  status: z.enum(["active", "archived"]).default("active")
});

const userSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "student"]).default("student"),
  status: z.enum(["pending", "active", "rejected", "suspended"]).default("active"),
  bio: z.string().max(500).optional().default(""),
  phone: z.string().max(30).optional().default(""),
  classIds: z.array(z.number().int().positive()).optional().default([])
});

const materialSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  youtubeUrl: z.string().min(11),
  thumbnailUrl: z.string().url().optional().or(z.literal("")).default(""),
  publishAt: z.string().datetime(),
  minWatchSeconds: z.number().int().min(30).default(180),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  targetClassIds: z.array(z.number().int().positive()).optional().default([]),
  targetCohortIds: z.array(z.number().int().positive()).optional().default([])
});

const evaluationSchema = z.object({
  materialId: z.number().int().positive(),
  title: z.string().min(3),
  instructions: z.string().max(2000).optional().default(""),
  durationLimitSeconds: z.number().int().min(60).default(900),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  questions: z.array(
    z.object({
      questionText: z.string().min(3),
      points: z.number().int().min(1).default(1),
      sortOrder: z.number().int().min(1).default(1),
      options: z.array(
        z.object({
          optionText: z.string().min(1),
          isCorrect: z.boolean(),
          sortOrder: z.number().int().min(1).default(1)
        })
      ).min(2)
    })
  ).min(1)
});

async function insertRegistrationLog(connection, settingId, action, oldSetting, newSetting, changedBy) {
  await connection.query(
    `INSERT INTO registration_setting_logs
      (registration_setting_id, action, old_open_at, old_close_at, new_open_at, new_close_at, changed_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      settingId,
      action,
      oldSetting?.registration_open_at ? formatMysqlDateTime(oldSetting.registration_open_at) : null,
      oldSetting?.registration_close_at ? formatMysqlDateTime(oldSetting.registration_close_at) : null,
      newSetting?.registrationOpenAt ? formatMysqlDateTime(newSetting.registrationOpenAt) : null,
      newSetting?.registrationCloseAt ? formatMysqlDateTime(newSetting.registrationCloseAt) : null,
      changedBy
    ]
  );
}

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const filters = paginationSchema.parse(req.query);
    const offset = (filters.page - 1) * filters.pageSize;
    const rows = await query(
      `SELECT
          u.id,
          u.full_name,
          u.email,
          u.username,
          u.role,
          u.status,
          u.bio,
          u.phone,
          u.created_at
        FROM users u
        WHERE (:status = '' OR u.status = :status)
          AND (
            :search = ''
            OR u.full_name LIKE CONCAT('%', :search, '%')
            OR u.email LIKE CONCAT('%', :search, '%')
            OR u.username LIKE CONCAT('%', :search, '%')
          )
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset`,
      {
        status: filters.status,
        search: filters.search,
        limit: filters.pageSize,
        offset
      }
    );

    const userIds = rows.map((row) => row.id);
    const classes = userIds.length
      ? await query(
        `SELECT uc.user_id, c.id, c.name, c.cohort_id AS cohortId, h.admission_year AS admissionYear
         FROM user_classes uc
         INNER JOIN classes c ON c.id = uc.class_id
         INNER JOIN cohorts h ON h.id = c.cohort_id
         WHERE uc.user_id IN (${userIds.map(() => "?").join(",")})
         ORDER BY h.admission_year DESC, c.name ASC`,
        userIds
      )
      : [];
    const classesByUser = new Map();
    for (const item of classes) {
      if (!classesByUser.has(item.user_id)) classesByUser.set(item.user_id, []);
      classesByUser.get(item.user_id).push({
        id: item.id,
        name: item.name,
        cohortId: item.cohortId,
        admissionYear: item.admissionYear
      });
    }

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        username: row.username,
        role: row.role,
        status: row.status,
        bio: row.bio,
        phone: row.phone,
        createdAt: row.created_at,
        classes: classesByUser.get(row.id) || []
      }))
    });
  })
);

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const payload = userSchema.extend({
      password: z.string().min(8)
    }).parse(req.body);

    const existing = await queryOne(
      `SELECT id FROM users WHERE email = :email OR username = :username LIMIT 1`,
      payload
    );

    if (existing) {
      throw new HttpError(409, "Email atau username sudah digunakan");
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const createdId = await withTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO users
          (username, email, password_hash, role, full_name, bio, phone, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          payload.username,
          payload.email,
          passwordHash,
          payload.role,
          payload.fullName,
          payload.bio,
          payload.phone,
          payload.status
        ]
      );

      for (const classId of payload.classIds) {
        await connection.query(
          `INSERT INTO user_classes (user_id, class_id, joined_at) VALUES (?, ?, UTC_TIMESTAMP())`,
          [result.insertId, classId]
        );
      }

      return result.insertId;
    });

    res.status(201).json({ data: { id: createdId } });
  })
);

router.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const payload = userSchema.parse(req.body);
    const userId = Number(req.params.id);

    const existing = await queryOne(
      `SELECT id FROM users WHERE (email = :email OR username = :username) AND id != :userId LIMIT 1`,
      { email: payload.email, username: payload.username, userId }
    );

    if (existing) {
      throw new HttpError(409, "Email atau username sudah digunakan");
    }

    await withTransaction(async (connection) => {
      const params = [
        payload.username,
        payload.email,
        payload.role,
        payload.fullName,
        payload.bio,
        payload.phone,
        payload.status,
        userId
      ];

      await connection.query(
        `UPDATE users
         SET username = ?, email = ?, role = ?, full_name = ?, bio = ?, phone = ?, status = ?, updated_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        params
      );

      if (payload.password) {
        const passwordHash = await bcrypt.hash(payload.password, 10);
        await connection.query(
          `UPDATE users SET password_hash = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
          [passwordHash, userId]
        );
      }

      await connection.query(`DELETE FROM user_classes WHERE user_id = ?`, [userId]);
      for (const classId of payload.classIds) {
        await connection.query(
          `INSERT INTO user_classes (user_id, class_id, joined_at) VALUES (?, ?, UTC_TIMESTAMP())`,
          [userId, classId]
        );
      }
    });

    res.json({ data: { message: "Pengguna berhasil diperbarui" } });
  })
);

router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM users WHERE id = :userId`, { userId: Number(req.params.id) });
    res.json({ data: { message: "Pengguna dihapus" } });
  })
);

router.post(
  "/users/:id/approve",
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE users SET status = 'active', updated_at = UTC_TIMESTAMP() WHERE id = :userId`,
      { userId: Number(req.params.id) }
    );
    res.json({ data: { message: "Akun disetujui" } });
  })
);

router.post(
  "/users/:id/reject",
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE users SET status = 'rejected', updated_at = UTC_TIMESTAMP() WHERE id = :userId`,
      { userId: Number(req.params.id) }
    );
    res.json({ data: { message: "Akun ditolak" } });
  })
);

router.get(
  "/registration-settings",
  asyncHandler(async (_req, res) => {
    const current = await queryOne(
      `SELECT * FROM registration_settings ORDER BY id DESC LIMIT 1`
    );
    const logs = await query(
      `SELECT *
       FROM registration_setting_logs
       ORDER BY created_at DESC
       LIMIT 20`
    );
    res.json({ data: { current, logs } });
  })
);

router.put(
  "/registration-settings",
  asyncHandler(async (req, res) => {
    const payload = registrationSettingSchema.parse(req.body);
    const previous = await queryOne(`SELECT * FROM registration_settings ORDER BY id DESC LIMIT 1`);

    const id = await withTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO registration_settings
          (registration_open_at, registration_close_at, status, updated_by, created_at, updated_at)
         VALUES (?, ?, 'configured', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          formatMysqlDateTime(payload.registrationOpenAt),
          formatMysqlDateTime(payload.registrationCloseAt),
          req.user.id
        ]
      );

      await insertRegistrationLog(connection, result.insertId, "update", previous, payload, req.user.id);
      return result.insertId;
    });

    res.json({ data: { id } });
  })
);

router.post(
  "/registration-settings/open-now",
  asyncHandler(async (req, res) => {
    const previous = await queryOne(`SELECT * FROM registration_settings ORDER BY id DESC LIMIT 1`);
    const now = new Date();
    const previousCloseAt = previous?.registration_close_at
      ? new Date(previous.registration_close_at)
      : null;
    const closeAt = previousCloseAt && previousCloseAt > now
      ? previousCloseAt
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const payload = {
      registrationOpenAt: now.toISOString(),
      registrationCloseAt: closeAt.toISOString()
    };

    await withTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO registration_settings
          (registration_open_at, registration_close_at, status, updated_by, created_at, updated_at)
         VALUES (?, ?, 'configured', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          formatMysqlDateTime(payload.registrationOpenAt),
          formatMysqlDateTime(payload.registrationCloseAt),
          req.user.id
        ]
      );

      await insertRegistrationLog(connection, result.insertId, "open-now", previous, payload, req.user.id);
    });

    res.json({ data: { message: "Pendaftaran dibuka sekarang" } });
  })
);

router.post(
  "/registration-settings/close-now",
  asyncHandler(async (req, res) => {
    const previous = await queryOne(`SELECT * FROM registration_settings ORDER BY id DESC LIMIT 1`);
    const nowIso = new Date().toISOString();
    const payload = {
      registrationOpenAt: previous?.registration_open_at || nowIso,
      registrationCloseAt: nowIso
    };

    await withTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO registration_settings
          (registration_open_at, registration_close_at, status, updated_by, created_at, updated_at)
         VALUES (?, ?, 'configured', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          formatMysqlDateTime(payload.registrationOpenAt),
          formatMysqlDateTime(payload.registrationCloseAt),
          req.user.id
        ]
      );
      await insertRegistrationLog(connection, result.insertId, "close-now", previous, payload, req.user.id);
    });

    res.json({ data: { message: "Pendaftaran ditutup sekarang" } });
  })
);

router.get(
  "/cohorts",
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT * FROM cohorts ORDER BY admission_year DESC, name ASC`);
    res.json({ data: rows });
  })
);

router.post(
  "/cohorts",
  asyncHandler(async (req, res) => {
    const payload = cohortSchema.parse(req.body);
    const result = await query(
      `INSERT INTO cohorts (name, admission_year, status, created_at, updated_at)
       VALUES (:name, :admissionYear, :status, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      payload
    );
    res.status(201).json({ data: { id: result.insertId } });
  })
);

router.patch(
  "/cohorts/:id",
  asyncHandler(async (req, res) => {
    const payload = cohortSchema.parse(req.body);
    await query(
      `UPDATE cohorts
       SET name = :name, admission_year = :admissionYear, status = :status, updated_at = UTC_TIMESTAMP()
       WHERE id = :id`,
      { ...payload, id: Number(req.params.id) }
    );
    res.json({ data: { message: "Angkatan diperbarui" } });
  })
);

router.delete(
  "/cohorts/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM cohorts WHERE id = :id`, { id: Number(req.params.id) });
    res.json({ data: { message: "Angkatan dihapus" } });
  })
);

router.get(
  "/classes",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT c.*, h.name AS cohort_name, h.admission_year
       FROM classes c
       INNER JOIN cohorts h ON h.id = c.cohort_id
       ORDER BY h.admission_year DESC, c.name ASC`
    );
    res.json({ data: rows });
  })
);

router.post(
  "/classes",
  asyncHandler(async (req, res) => {
    const payload = classSchema.parse(req.body);
    const result = await query(
      `INSERT INTO classes (name, cohort_id, description, status, created_at, updated_at)
       VALUES (:name, :cohortId, :description, :status, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      payload
    );
    res.status(201).json({ data: { id: result.insertId } });
  })
);

router.patch(
  "/classes/:id",
  asyncHandler(async (req, res) => {
    const payload = classSchema.parse(req.body);
    await query(
      `UPDATE classes
       SET name = :name, cohort_id = :cohortId, description = :description, status = :status, updated_at = UTC_TIMESTAMP()
       WHERE id = :id`,
      { ...payload, id: Number(req.params.id) }
    );
    res.json({ data: { message: "Kelas diperbarui" } });
  })
);

router.delete(
  "/classes/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM classes WHERE id = :id`, { id: Number(req.params.id) });
    res.json({ data: { message: "Kelas dihapus" } });
  })
);

router.get(
  "/materials",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT
          m.*,
          mt.class_id,
          mt.cohort_id
        FROM materials m
        LEFT JOIN material_targets mt ON mt.material_id = m.id
        ORDER BY m.publish_at DESC, mt.id ASC`
    );

    const byId = new Map();
    for (const row of rows) {
      if (!byId.has(row.id)) {
        const { class_id, cohort_id, ...material } = row;
        byId.set(row.id, { ...material, targets: [] });
      }
      if (row.class_id || row.cohort_id) {
        byId.get(row.id).targets.push({
          classId: row.class_id,
          cohortId: row.cohort_id
        });
      }
    }

    res.json({
      data: [...byId.values()]
    });
  })
);

router.post(
  "/materials",
  asyncHandler(async (req, res) => {
    const payload = materialSchema.parse(req.body);
    const youtube = assertYoutubeUrl(payload.youtubeUrl);
    if (!youtube) {
      throw new HttpError(400, "URL YouTube tidak valid");
    }

    const createdId = await withTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO materials
          (title, description, youtube_url, youtube_video_id, thumbnail_url, publish_at, min_watch_seconds, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          payload.title,
          payload.description,
          payload.youtubeUrl,
          youtube.videoId,
          payload.thumbnailUrl || null,
          formatMysqlDateTime(payload.publishAt),
          payload.minWatchSeconds,
          payload.status,
          req.user.id
        ]
      );

      for (const classId of payload.targetClassIds) {
        await connection.query(
          `INSERT INTO material_targets (material_id, class_id, cohort_id) VALUES (?, ?, NULL)`,
          [result.insertId, classId]
        );
      }

      for (const cohortId of payload.targetCohortIds) {
        await connection.query(
          `INSERT INTO material_targets (material_id, class_id, cohort_id) VALUES (?, NULL, ?)`,
          [result.insertId, cohortId]
        );
      }

      return result.insertId;
    });

    res.status(201).json({ data: { id: createdId } });
  })
);

router.patch(
  "/materials/:id",
  asyncHandler(async (req, res) => {
    const payload = materialSchema.parse(req.body);
    const youtube = assertYoutubeUrl(payload.youtubeUrl);
    if (!youtube) {
      throw new HttpError(400, "URL YouTube tidak valid");
    }

    const materialId = Number(req.params.id);

    await withTransaction(async (connection) => {
      await connection.query(
        `UPDATE materials
         SET title = ?, description = ?, youtube_url = ?, youtube_video_id = ?, thumbnail_url = ?, publish_at = ?, min_watch_seconds = ?, status = ?, updated_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [
          payload.title,
          payload.description,
          payload.youtubeUrl,
          youtube.videoId,
          payload.thumbnailUrl || null,
          formatMysqlDateTime(payload.publishAt),
          payload.minWatchSeconds,
          payload.status,
          materialId
        ]
      );

      await connection.query(`DELETE FROM material_targets WHERE material_id = ?`, [materialId]);
      for (const classId of payload.targetClassIds) {
        await connection.query(
          `INSERT INTO material_targets (material_id, class_id, cohort_id) VALUES (?, ?, NULL)`,
          [materialId, classId]
        );
      }
      for (const cohortId of payload.targetCohortIds) {
        await connection.query(
          `INSERT INTO material_targets (material_id, class_id, cohort_id) VALUES (?, NULL, ?)`,
          [materialId, cohortId]
        );
      }
    });

    res.json({ data: { message: "Materi diperbarui" } });
  })
);

router.delete(
  "/materials/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM materials WHERE id = :id`, { id: Number(req.params.id) });
    res.json({ data: { message: "Materi dihapus" } });
  })
);

router.get(
  "/evaluations",
  asyncHandler(async (req, res) => {
    const filters = paginationSchema.parse(req.query);
    const rows = await query(
      `SELECT
          e.*,
          m.title AS material_title,
          COUNT(q.id) AS question_count
        FROM evaluations e
        INNER JOIN materials m ON m.id = e.material_id
        LEFT JOIN questions q ON q.evaluation_id = e.id
        WHERE (:materialId IS NULL OR e.material_id = :materialId)
        GROUP BY e.id
        ORDER BY e.id DESC`,
      { materialId: filters.materialId || null }
    );
    res.json({ data: rows });
  })
);

router.post(
  "/evaluations",
  asyncHandler(async (req, res) => {
    const payload = evaluationSchema.parse(req.body);
    const createdId = await withTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO evaluations
          (material_id, title, instructions, duration_limit_seconds, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          payload.materialId,
          payload.title,
          payload.instructions,
          payload.durationLimitSeconds,
          payload.status
        ]
      );

      for (const question of payload.questions) {
        const [questionResult] = await connection.query(
          `INSERT INTO questions
            (evaluation_id, question_text, points, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [result.insertId, question.questionText, question.points, question.sortOrder]
        );

        for (const option of question.options) {
          await connection.query(
            `INSERT INTO question_options
              (question_id, option_text, is_correct, sort_order)
             VALUES (?, ?, ?, ?)`,
            [questionResult.insertId, option.optionText, option.isCorrect ? 1 : 0, option.sortOrder]
          );
        }
      }

      return result.insertId;
    });

    res.status(201).json({ data: { id: createdId } });
  })
);

router.patch(
  "/evaluations/:id",
  asyncHandler(async (req, res) => {
    const payload = evaluationSchema.parse(req.body);
    const evaluationId = Number(req.params.id);
    await withTransaction(async (connection) => {
      await connection.query(
        `UPDATE evaluations
         SET material_id = ?, title = ?, instructions = ?, duration_limit_seconds = ?, status = ?, updated_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [
          payload.materialId,
          payload.title,
          payload.instructions,
          payload.durationLimitSeconds,
          payload.status,
          evaluationId
        ]
      );

      const [questionIds] = await connection.query(`SELECT id FROM questions WHERE evaluation_id = ?`, [evaluationId]);
      if (questionIds.length > 0) {
        await connection.query(
          `DELETE FROM question_options WHERE question_id IN (${questionIds.map(() => "?").join(",")})`,
          questionIds.map((item) => item.id)
        );
      }
      await connection.query(`DELETE FROM questions WHERE evaluation_id = ?`, [evaluationId]);

      for (const question of payload.questions) {
        const [questionResult] = await connection.query(
          `INSERT INTO questions
            (evaluation_id, question_text, points, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [evaluationId, question.questionText, question.points, question.sortOrder]
        );

        for (const option of question.options) {
          await connection.query(
            `INSERT INTO question_options
              (question_id, option_text, is_correct, sort_order)
             VALUES (?, ?, ?, ?)`,
            [questionResult.insertId, option.optionText, option.isCorrect ? 1 : 0, option.sortOrder]
          );
        }
      }
    });

    res.json({ data: { message: "Evaluasi diperbarui" } });
  })
);

router.delete(
  "/evaluations/:id",
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM evaluations WHERE id = :id`, { id: Number(req.params.id) });
    res.json({ data: { message: "Evaluasi dihapus" } });
  })
);

router.get(
  "/reports/progress",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT
          u.full_name,
          m.title AS material_title,
          mp.watched_seconds,
          m.min_watch_seconds,
          mp.completed_at,
          mp.updated_at
        FROM material_progress mp
        INNER JOIN users u ON u.id = mp.user_id
        INNER JOIN materials m ON m.id = mp.material_id
        ORDER BY mp.updated_at DESC`
    );
    res.json({ data: rows });
  })
);

router.get(
  "/reports/results",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT
          u.full_name,
          m.title AS material_title,
          e.title AS evaluation_title,
          ea.score,
          ea.correct_count,
          ea.duration_seconds,
          ea.submitted_at
        FROM evaluation_attempts ea
        INNER JOIN users u ON u.id = ea.user_id
        INNER JOIN evaluations e ON e.id = ea.evaluation_id
        INNER JOIN materials m ON m.id = e.material_id
        WHERE ea.status = 'submitted'
        ORDER BY ea.submitted_at DESC`
    );
    res.json({ data: rows });
  })
);

export default router;
