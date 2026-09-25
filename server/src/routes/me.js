import express from "express";
import { z } from "zod";
import { mapUserRecord, query, queryOne } from "../db/helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";

const router = express.Router();

const profileSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  bio: z.string().max(500).optional().default(""),
  phone: z.string().max(30).optional().default("")
});

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await queryOne(
      `SELECT
          u.id,
          u.username,
          u.email,
          u.role,
          u.full_name,
          u.bio,
          u.phone,
          u.status
        FROM users u
        WHERE u.id = :userId
        LIMIT 1`,
      { userId: req.user.id }
    );

    const classes = await query(
      `SELECT
          c.id,
          c.name,
          c.cohort_id AS cohortId,
          h.name AS cohortName,
          h.admission_year AS admissionYear
        FROM user_classes uc
        INNER JOIN classes c ON c.id = uc.class_id
        INNER JOIN cohorts h ON h.id = c.cohort_id
        WHERE uc.user_id = :userId
        ORDER BY h.admission_year DESC, c.name ASC`,
      { userId: req.user.id }
    );

    if (user) {
      user.classes_json = JSON.stringify(classes);
    }

    res.json({ data: mapUserRecord(user) });
  })
);

router.patch(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = profileSchema.parse(req.body);
    const existing = await queryOne(
      `SELECT id
       FROM users
       WHERE email = :email AND id != :userId
       LIMIT 1`,
      {
        email: payload.email,
        userId: req.user.id
      }
    );

    if (existing) {
      throw new HttpError(409, "Email sudah digunakan");
    }

    await query(
      `UPDATE users
       SET full_name = :fullName,
           email = :email,
           bio = :bio,
           phone = :phone,
           updated_at = UTC_TIMESTAMP()
       WHERE id = :userId`,
      {
        ...payload,
        userId: req.user.id
      }
    );

    res.json({
      data: {
        message: "Profil berhasil diperbarui"
      }
    });
  })
);

router.get(
  "/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT
          m.id,
          m.title,
          m.publish_at,
          m.min_watch_seconds,
          COALESCE(mp.watched_seconds, 0) AS watched_seconds,
          mp.completed_at
        FROM material_progress mp
        INNER JOIN materials m ON m.id = mp.material_id
        WHERE mp.user_id = :userId
        ORDER BY m.publish_at DESC`,
      { userId: req.user.id }
    );

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        publishAt: row.publish_at,
        minWatchSeconds: row.min_watch_seconds,
        watchedSeconds: row.watched_seconds,
        completedAt: row.completed_at
      }))
    });
  })
);

export default router;
