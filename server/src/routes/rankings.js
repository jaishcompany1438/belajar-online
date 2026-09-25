import express from "express";
import { z } from "zod";
import { query } from "../db/helpers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http-error.js";

const router = express.Router();

const filterSchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
  cohortId: z.coerce.number().int().positive().optional()
});

router.get(
  "/",
  requireAuth,
  requireRole("student", "admin"),
  asyncHandler(async (req, res) => {
    const filters = filterSchema.parse(req.query);
    const params = {
      classId: filters.classId || null,
      cohortId: filters.cohortId || null
    };

    const rows = await query(
      `SELECT
          u.id,
          u.full_name,
          COALESCE(scores.total_score, 0) AS total_score,
          COALESCE(scores.total_correct, 0) AS total_correct,
          COALESCE(scores.total_duration, 0) AS total_duration,
          scores.first_submission_at,
          c.id AS class_id,
          c.name AS class_name,
          c.cohort_id,
          h.admission_year
        FROM users u
        INNER JOIN user_classes uc ON uc.user_id = u.id
        INNER JOIN classes c ON c.id = uc.class_id
        INNER JOIN cohorts h ON h.id = c.cohort_id
        LEFT JOIN (
          SELECT user_id, SUM(score) AS total_score, SUM(correct_count) AS total_correct,
                 SUM(duration_seconds) AS total_duration, MIN(submitted_at) AS first_submission_at
          FROM evaluation_attempts
          WHERE status = 'submitted'
          GROUP BY user_id
        ) scores ON scores.user_id = u.id
        WHERE u.role = 'student'
          AND u.status = 'active'
          AND (:classId IS NULL OR c.id = :classId)
          AND (:cohortId IS NULL OR h.id = :cohortId)
        ORDER BY total_score DESC, total_duration ASC, first_submission_at ASC`,
      params
    );

    const byUser = new Map();
    for (const row of rows) {
      if (!byUser.has(row.id)) {
        byUser.set(row.id, {
          userId: row.id,
          fullName: row.full_name,
          totalScore: Number(row.total_score || 0),
          totalCorrect: Number(row.total_correct || 0),
          totalDuration: Number(row.total_duration || 0),
          firstSubmissionAt: row.first_submission_at,
          classes: []
        });
      }
      byUser.get(row.id).classes.push({
        id: row.class_id,
        name: row.class_name,
        cohortId: row.cohort_id,
        admissionYear: row.admission_year
      });
    }
    const ranking = [...byUser.values()].map((row, index) => ({
      position: index + 1,
      ...row
    }));

    res.json({
      data: {
        ranking,
        me: ranking.find((item) => item.userId === req.user.id) || null
      }
    });
  })
);

export default router;
