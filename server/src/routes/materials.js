import express from "express";
import { z } from "zod";
import { getAccessibleMaterial, query, queryOne, withTransaction } from "../db/helpers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";

const router = express.Router();

const heartbeatSchema = z.object({
  watchedSeconds: z.number().min(1).max(30)
});

router.get(
  "/",
  requireAuth,
  requireRole("student", "admin"),
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT DISTINCT
          m.id,
          m.title,
          m.description,
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
        WHERE m.status = 'published'
          AND m.publish_at <= UTC_TIMESTAMP()
          AND (
            mt.id IS NOT NULL
            OR NOT EXISTS (
              SELECT 1
              FROM material_targets mt_all
              WHERE mt_all.material_id = m.id
            )
          )
        ORDER BY m.publish_at DESC`,
      { userId: req.user.id }
    );

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        youtubeVideoId: row.youtube_video_id,
        thumbnailUrl: row.thumbnail_url,
        publishAt: row.publish_at,
        minWatchSeconds: row.min_watch_seconds,
        watchedSeconds: row.watched_seconds,
        completedAt: row.completed_at,
        status:
          row.completed_at
            ? "completed"
            : row.watched_seconds > 0
              ? "watching"
              : "not_started"
      }))
    });
  })
);

router.get(
  "/:id",
  requireAuth,
  requireRole("student", "admin"),
  asyncHandler(async (req, res) => {
    const material = await getAccessibleMaterial(req.user.id, Number(req.params.id));
    if (!material) {
      throw new HttpError(404, "Materi tidak ditemukan");
    }

    const evaluations = await query(
      `SELECT
          e.id,
          e.title,
          e.instructions,
          e.status,
          ea.id AS attempt_id,
          ea.score,
          ea.submitted_at
        FROM evaluations e
        LEFT JOIN evaluation_attempts ea
          ON ea.evaluation_id = e.id
         AND ea.user_id = :userId
        WHERE e.material_id = :materialId
          AND e.status = 'active'
        ORDER BY e.id ASC`,
      {
        userId: req.user.id,
        materialId: Number(req.params.id)
      }
    );

    res.json({
      data: {
        id: material.id,
        title: material.title,
        description: material.description,
        youtubeUrl: material.youtube_url,
        youtubeVideoId: material.youtube_video_id,
        thumbnailUrl: material.thumbnail_url,
        publishAt: material.publish_at,
        minWatchSeconds: material.min_watch_seconds,
        watchedSeconds: material.watched_seconds,
        completedAt: material.completed_at,
        evaluationUnlocked: material.watched_seconds >= material.min_watch_seconds,
        evaluations: evaluations.map((item) => ({
          id: item.id,
          title: item.title,
          instructions: item.instructions,
          status: item.status,
          attemptId: item.attempt_id,
          score: item.score,
          submittedAt: item.submitted_at
        }))
      }
    });
  })
);

router.post(
  "/:id/watch-sessions",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const material = await getAccessibleMaterial(req.user.id, Number(req.params.id));
    if (!material) {
      throw new HttpError(404, "Materi tidak ditemukan");
    }

    const sessionId = await withTransaction(async (connection) => {
      await connection.query(
        `UPDATE watch_sessions
         SET status = 'interrupted', ended_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND material_id = ? AND status = 'active'`,
        [req.user.id, material.id]
      );

      const [result] = await connection.query(
        `INSERT INTO watch_sessions
          (user_id, material_id, started_at, last_heartbeat_at, ended_at, accumulated_seconds, status)
         VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), NULL, 0, 'active')`,
        [req.user.id, material.id]
      );

      return result.insertId;
    });

    res.status(201).json({
      data: {
        id: sessionId,
        materialId: material.id
      }
    });
  })
);

router.post(
  "/watch-sessions/:id/heartbeat",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const payload = heartbeatSchema.parse(req.body);
    const session = await queryOne(
      `SELECT ws.id, ws.user_id, ws.material_id, ws.accumulated_seconds, ws.status, m.min_watch_seconds
       FROM watch_sessions ws
       INNER JOIN materials m ON m.id = ws.material_id
       WHERE ws.id = :sessionId AND ws.user_id = :userId
       LIMIT 1`,
      {
        sessionId: Number(req.params.id),
        userId: req.user.id
      }
    );

    if (!session || session.status !== "active") {
      throw new HttpError(400, "Sesi menonton tidak aktif");
    }

    await withTransaction(async (connection) => {
      await connection.query(
        `UPDATE watch_sessions
         SET accumulated_seconds = accumulated_seconds + ?,
             last_heartbeat_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [payload.watchedSeconds, session.id]
      );

      await connection.query(
        `INSERT INTO material_progress (user_id, material_id, watched_seconds, completed_at, updated_at)
         VALUES (?, ?, ?, NULL, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           watched_seconds = watched_seconds + VALUES(watched_seconds),
           updated_at = UTC_TIMESTAMP(),
           completed_at = CASE
             WHEN watched_seconds + VALUES(watched_seconds) >= ? AND completed_at IS NULL
               THEN UTC_TIMESTAMP()
             ELSE completed_at
           END`,
        [req.user.id, session.material_id, payload.watchedSeconds, session.min_watch_seconds]
      );
    });

    const progress = await queryOne(
      `SELECT watched_seconds, completed_at
       FROM material_progress
       WHERE user_id = :userId AND material_id = :materialId
       LIMIT 1`,
      {
        userId: req.user.id,
        materialId: session.material_id
      }
    );

    res.json({
      data: {
        watchedSeconds: progress?.watched_seconds || 0,
        completedAt: progress?.completed_at || null,
        completed: Boolean(progress?.completed_at)
      }
    });
  })
);

router.post(
  "/watch-sessions/:id/finish",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const session = await queryOne(
      `SELECT ws.id, ws.material_id, mp.watched_seconds, m.min_watch_seconds
       FROM watch_sessions ws
       INNER JOIN materials m ON m.id = ws.material_id
       LEFT JOIN material_progress mp
         ON mp.user_id = ws.user_id
        AND mp.material_id = ws.material_id
       WHERE ws.id = :sessionId AND ws.user_id = :userId
       LIMIT 1`,
      {
        sessionId: Number(req.params.id),
        userId: req.user.id
      }
    );

    if (!session) {
      throw new HttpError(404, "Sesi menonton tidak ditemukan");
    }

    await query(
      `UPDATE watch_sessions
       SET status = 'finished', ended_at = UTC_TIMESTAMP()
       WHERE id = :sessionId`,
      { sessionId: session.id }
    );

    res.json({
      data: {
        completed: (session.watched_seconds || 0) >= session.min_watch_seconds,
        watchedSeconds: session.watched_seconds || 0
      }
    });
  })
);

router.get(
  "/:id/progress",
  requireAuth,
  requireRole("student", "admin"),
  asyncHandler(async (req, res) => {
    const progress = await queryOne(
      `SELECT watched_seconds, completed_at, updated_at
       FROM material_progress
       WHERE user_id = :userId AND material_id = :materialId
       LIMIT 1`,
      {
        userId: req.user.id,
        materialId: Number(req.params.id)
      }
    );

    res.json({
      data: {
        watchedSeconds: progress?.watched_seconds || 0,
        completedAt: progress?.completed_at || null,
        updatedAt: progress?.updated_at || null
      }
    });
  })
);

export default router;
