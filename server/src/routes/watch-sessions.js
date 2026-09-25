import express from "express";
import { z } from "zod";
import { query, queryOne, withTransaction } from "../db/helpers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";

const router = express.Router();

const heartbeatSchema = z.object({
  watchedSeconds: z.number().min(1).max(30)
});

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

export default router;
