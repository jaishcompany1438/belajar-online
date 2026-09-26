import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  computeRegistrationStatus,
  getLatestRegistrationSetting,
  mapUserRecord,
  query,
  queryOne,
  withTransaction
} from "../db/helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";
import { signToken } from "../utils/jwt.js";
import { sendVerificationEmail } from "../services/email.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8)
});

const registerSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8),
  bio: z.string().max(500).optional().default(""),
  phone: z.string().max(30).optional().default(""),
  classIds: z.array(z.number().int().positive()).min(1)
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

const verifySchema = z.object({
  token: z.string().min(20),
  code: z.string().regex(/^\d{6}$/)
});

function hashVerificationValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function serializeCurrentUser(userId) {
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
    { userId }
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
    { userId }
  );

  if (user) {
    user.classes_json = JSON.stringify(classes);
  }

  return mapUserRecord(user);
}

router.get(
  "/registration-status",
  asyncHandler(async (_req, res) => {
    const setting = await getLatestRegistrationSetting();
    const classes = await query(
      `SELECT
          c.id,
          c.name,
          c.description,
          h.id AS cohort_id,
          h.name AS cohort_name,
          h.admission_year
        FROM classes c
        INNER JOIN cohorts h ON h.id = c.cohort_id
        WHERE c.status = 'active' AND h.status = 'active'
        ORDER BY h.admission_year DESC, c.name ASC`
    );

    const registration = computeRegistrationStatus(setting);

    res.json({
      data: {
        ...registration,
        registrationOpenAt: setting?.registration_open_at || null,
        registrationCloseAt: setting?.registration_close_at || null,
        classes: classes.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          cohortId: item.cohort_id,
          cohortName: item.cohort_name,
          admissionYear: item.admission_year
        }))
      }
    });
  })
);

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const setting = await getLatestRegistrationSetting();
    const registration = computeRegistrationStatus(setting);

    if (!registration.registrationOpen) {
      throw new HttpError(403, "Pendaftaran belum tersedia");
    }

    const existing = await queryOne(
      `SELECT id, email, username
       FROM users
       WHERE email = :email OR username = :username
       LIMIT 1`,
      payload
    );

    if (existing) {
      throw new HttpError(409, "Email atau username sudah digunakan");
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const verificationCode = String(crypto.randomInt(100000, 1000000));
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const createdUser = await withTransaction(async (connection) => {
      const [insertResult] = await connection.query(
        `INSERT INTO users
          (username, email, password_hash, role, full_name, bio, phone, status,
           verification_token_hash, verification_code_hash, verification_expires_at,
           created_at, updated_at)
         VALUES (?, ?, ?, 'student', ?, ?, ?, 'pending', ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          payload.username,
          payload.email,
          passwordHash,
          payload.fullName,
          payload.bio,
          payload.phone,
          hashVerificationValue(verificationToken),
          hashVerificationValue(verificationCode),
          verificationExpiresAt
        ]
      );

      for (const classId of payload.classIds) {
        await connection.query(
          `INSERT INTO user_classes (user_id, class_id, joined_at)
           VALUES (?, ?, UTC_TIMESTAMP())`,
          [insertResult.insertId, classId]
        );
      }

      await connection.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata_json, created_at)
         VALUES (?, 'register', 'users', ?, JSON_OBJECT('classIds', ?), UTC_TIMESTAMP())`,
        [insertResult.insertId, insertResult.insertId, JSON.stringify(payload.classIds)]
      );

      return insertResult.insertId;
    });

    try {
      await sendVerificationEmail({
        email: payload.email,
        fullName: payload.fullName,
        code: verificationCode,
        token: verificationToken
      });
    } catch (error) {
      console.error("Verification email failed:", error);
      throw new HttpError(503, "Pendaftaran tersimpan, tetapi email verifikasi gagal dikirim. Hubungi admin.");
    }

    res.status(201).json({
      data: {
        id: createdUser,
        status: "pending",
        message: "Pendaftaran berhasil. Silakan cek email untuk kode verifikasi."
      }
    });
  })
);

router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const payload = verifySchema.parse(req.body);
    const user = await queryOne(
      `SELECT id, status, verification_code_hash, verification_expires_at
       FROM users
       WHERE verification_token_hash = :tokenHash
       LIMIT 1`,
      { tokenHash: hashVerificationValue(payload.token) }
    );

    if (!user || user.status !== "pending") {
      throw new HttpError(400, "Link verifikasi tidak valid atau akun sudah diverifikasi");
    }

    if (!user.verification_expires_at || new Date(user.verification_expires_at) < new Date()) {
      throw new HttpError(400, "Kode verifikasi sudah kedaluwarsa");
    }

    if (hashVerificationValue(payload.code) !== user.verification_code_hash) {
      throw new HttpError(400, "Nomor verifikasi tidak sesuai");
    }

    await query(
      `UPDATE users
       SET status = 'active',
           verified_at = UTC_TIMESTAMP(),
           verification_token_hash = NULL,
           verification_code_hash = NULL,
           verification_expires_at = NULL,
           updated_at = UTC_TIMESTAMP()
       WHERE id = :userId`,
      { userId: user.id }
    );

    res.json({ data: { message: "Email berhasil diverifikasi. Silakan login." } });
  })
);

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);

    const user = await queryOne(
      `SELECT id, username, email, password_hash, role, full_name, status
       FROM users
       WHERE email = :identifier OR username = :identifier
       LIMIT 1`,
      payload
    );

    if (!user) {
      throw new HttpError(401, "Kredensial tidak valid");
    }

    const isValid = await bcrypt.compare(payload.password, user.password_hash);

    if (!isValid) {
      throw new HttpError(401, "Kredensial tidak valid");
    }

    if (user.status === "pending") {
      throw new HttpError(403, "Akun belum diverifikasi. Silakan cek email Anda.");
    }

    if (user.status === "rejected") {
      throw new HttpError(403, "Akun ditolak admin");
    }

    if (user.status !== "active") {
      throw new HttpError(403, "Akun tidak aktif");
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      username: user.username
    });

    const currentUser = await serializeCurrentUser(user.id);

    res.json({
      data: {
        token,
        user: currentUser
      }
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.json({
      data: {
        message: "Logout berhasil"
      }
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await serializeCurrentUser(req.user.id);
    res.json({ data: user });
  })
);

router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = changePasswordSchema.parse(req.body);

    const user = await queryOne(
      `SELECT id, password_hash
       FROM users
       WHERE id = :userId
       LIMIT 1`,
      { userId: req.user.id }
    );

    if (!user) {
      throw new HttpError(404, "Pengguna tidak ditemukan");
    }

    const matches = await bcrypt.compare(payload.oldPassword, user.password_hash);
    if (!matches) {
      throw new HttpError(400, "Password lama tidak sesuai");
    }

    const newHash = await bcrypt.hash(payload.newPassword, 10);
    await query(
      `UPDATE users
       SET password_hash = :passwordHash, updated_at = UTC_TIMESTAMP()
       WHERE id = :userId`,
      {
        passwordHash: newHash,
        userId: req.user.id
      }
    );

    res.json({
      data: {
        message: "Password berhasil diperbarui"
      }
    });
  })
);

export default router;
