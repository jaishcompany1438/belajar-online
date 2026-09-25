import express from "express";
import { attachRankingPosition } from "../utils/ranking.js";
import { query } from "../db/helpers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http-error.js";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("student", "admin"),
  asyncHandler(async (req, res) => {
    const [materialCounts] = await query(
      `SELECT
          COUNT(DISTINCT m.id) AS total_materials,
          COUNT(DISTINCT CASE WHEN mp.completed_at IS NOT NULL THEN m.id END) AS completed_materials
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
          ON mp.material_id = m.id
         AND mp.user_id = :userId
        WHERE m.status = 'published'
          AND m.publish_at <= UTC_TIMESTAMP()
          AND (
            mt.id IS NOT NULL
            OR NOT EXISTS (
              SELECT 1
              FROM material_targets mt_all
              WHERE mt_all.material_id = m.id
            )
          )`,
      { userId: req.user.id }
    );

    const latestMaterials = await query(
      `SELECT DISTINCT
          m.id,
          m.title,
          m.publish_at,
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
        ORDER BY m.publish_at DESC
        LIMIT 5`,
      { userId: req.user.id }
    );

    const lastResult = await query(
      `SELECT
          ea.id,
          ea.score,
          ea.correct_count,
          ea.duration_seconds,
          ea.submitted_at,
          e.title
        FROM evaluation_attempts ea
        INNER JOIN evaluations e ON e.id = ea.evaluation_id
        WHERE ea.user_id = :userId AND ea.status = 'submitted'
        ORDER BY ea.submitted_at DESC
        LIMIT 1`,
      { userId: req.user.id }
    );

    const rankingRows = await query(
      `SELECT
          u.id AS userId,
          u.full_name AS fullName,
          COALESCE(SUM(ea.score), 0) AS totalScore,
          COALESCE(SUM(ea.duration_seconds), 0) AS totalDuration,
          MIN(ea.submitted_at) AS firstSubmissionAt
        FROM users u
        INNER JOIN user_classes uc ON uc.user_id = u.id
        LEFT JOIN evaluation_attempts ea
          ON ea.user_id = u.id
         AND ea.status = 'submitted'
        WHERE uc.class_id IN (
          SELECT class_id FROM user_classes WHERE user_id = :userId
        )
          AND u.status = 'active'
          AND u.role = 'student'
        GROUP BY u.id`,
      { userId: req.user.id }
    );

    const ranking = attachRankingPosition(
      rankingRows.map((row) => ({
        userId: row.userId,
        fullName: row.fullName,
        totalScore: Number(row.totalScore || 0),
        totalDuration: Number(row.totalDuration || 0),
        firstSubmissionAt: row.firstSubmissionAt || new Date(0).toISOString()
      }))
    );

    const currentRank = ranking.find((item) => item.userId === req.user.id) || null;

    res.json({
      data: {
        greeting: "Selamat belajar",
        totalMaterials: Number(materialCounts?.total_materials || 0),
        completedMaterials: Number(materialCounts?.completed_materials || 0),
        remainingMaterials:
          Number(materialCounts?.total_materials || 0) - Number(materialCounts?.completed_materials || 0),
        progressPercent: materialCounts?.total_materials
          ? Math.round((Number(materialCounts.completed_materials) / Number(materialCounts.total_materials)) * 100)
          : 0,
        latestMaterials,
        availableEvaluations: await query(
          `SELECT
              e.id,
              e.title,
              m.title AS material_title
            FROM evaluations e
            INNER JOIN materials m ON m.id = e.material_id
            INNER JOIN material_progress mp
              ON mp.material_id = m.id
             AND mp.user_id = :userId
            LEFT JOIN evaluation_attempts ea
              ON ea.evaluation_id = e.id
             AND ea.user_id = :userId
            WHERE e.status = 'active'
              AND mp.watched_seconds >= m.min_watch_seconds
              AND ea.id IS NULL
            ORDER BY m.publish_at DESC
            LIMIT 5`,
          { userId: req.user.id }
        ),
        lastResult: lastResult[0] || null,
        rankingTop: ranking.slice(0, 5),
        currentRank
      }
    });
  })
);

export default router;
