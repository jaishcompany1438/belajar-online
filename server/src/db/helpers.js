import { pool } from "./pool.js";

export async function query(sql, params = {}) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function queryOne(sql, params = {}) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function execute(connection, sql, params = {}) {
  const [rows] = await connection.query(sql, params);
  return rows;
}

export function computeRegistrationStatus(setting) {
  if (!setting || !setting.registration_open_at || !setting.registration_close_at) {
    return {
      status: "closed",
      registrationOpen: false,
      message: "Pendaftaran belum tersedia"
    };
  }

  const now = new Date();
  const openAt = new Date(setting.registration_open_at);
  const closeAt = new Date(setting.registration_close_at);

  if (now < openAt) {
    return {
      status: "scheduled",
      registrationOpen: false,
      message: "Pendaftaran belum tersedia"
    };
  }

  if (now > closeAt) {
    return {
      status: "closed",
      registrationOpen: false,
      message: "Pendaftaran belum tersedia"
    };
  }

  return {
    status: "open",
    registrationOpen: true,
    message: "Pendaftaran dibuka"
  };
}

export async function getLatestRegistrationSetting() {
  return queryOne(
    `SELECT id, registration_open_at, registration_close_at, updated_by, created_at, updated_at
     FROM registration_settings
     ORDER BY id DESC
     LIMIT 1`
  );
}

export async function getUserWithClasses(userId) {
  const user = await queryOne(
    `SELECT
        u.id,
        u.username,
        u.email,
        u.role,
        u.full_name,
        u.bio,
        u.phone,
        u.status,
      FROM users u
      WHERE u.id = :userId`,
    { userId }
  );

  if (!user) {
    return null;
  }

  const classes = await query(
    `SELECT c.id, c.name, c.cohort_id AS cohortId, h.name AS cohortName,
            h.admission_year AS admissionYear
     FROM user_classes uc
     INNER JOIN classes c ON c.id = uc.class_id
     INNER JOIN cohorts h ON h.id = c.cohort_id
     WHERE uc.user_id = :userId
     ORDER BY h.admission_year DESC, c.name ASC`,
    { userId }
  );

  user.classes_json = classes;
  return user;
}

export function mapUserRecord(user) {
  if (!user) {
    return null;
  }

  const classes = typeof user.classes_json === "string"
    ? JSON.parse(user.classes_json)
    : user.classes_json || [];

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    bio: user.bio,
    phone: user.phone,
    status: user.status,
    classes: classes.filter((item) => item && item.id)
  };
}

export async function getAccessibleMaterial(userId, materialId) {
  return queryOne(
    `SELECT DISTINCT
        m.id,
        m.title,
        m.description,
        m.youtube_url,
        m.youtube_video_id,
        m.thumbnail_url,
        m.publish_at,
        m.min_watch_seconds,
        m.status,
        COALESCE(mp.watched_seconds, 0) AS watched_seconds,
        mp.completed_at
      FROM materials m
      INNER JOIN user_classes uc ON uc.user_id = :userId
      INNER JOIN classes c ON c.id = uc.class_id
      LEFT JOIN material_targets mt
        ON mt.material_id = m.id
       AND (
         mt.class_id = c.id
         OR (mt.cohort_id IS NOT NULL AND mt.cohort_id = c.cohort_id)
       )
      LEFT JOIN material_progress mp
        ON mp.user_id = :userId
       AND mp.material_id = m.id
      WHERE m.id = :materialId
        AND m.status = 'published'
        AND m.publish_at <= UTC_TIMESTAMP()
        AND (
          mt.id IS NOT NULL
          OR NOT EXISTS (
            SELECT 1
            FROM material_targets mt_all
            WHERE mt_all.material_id = m.id
          )
        )
      LIMIT 1`,
    { userId, materialId }
  );
}
