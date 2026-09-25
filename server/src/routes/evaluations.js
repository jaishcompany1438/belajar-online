import express from "express";
import { z } from "zod";
import { getAccessibleMaterial, query, queryOne, withTransaction } from "../db/helpers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http-error.js";

const router = express.Router();

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      selectedOptionId: z.number().int().positive()
    })
  )
});

async function assertEvaluationAccess(userId, evaluationId) {
  const evaluation = await queryOne(
    `SELECT e.id, e.material_id, e.title, e.instructions, e.status, m.min_watch_seconds
     FROM evaluations e
     INNER JOIN materials m ON m.id = e.material_id
     WHERE e.id = :evaluationId
     LIMIT 1`,
    { evaluationId }
  );

  if (!evaluation || evaluation.status !== "active") {
    throw new HttpError(404, "Evaluasi tidak ditemukan");
  }

  const material = await getAccessibleMaterial(userId, evaluation.material_id);
  if (!material) {
    throw new HttpError(404, "Materi tidak ditemukan");
  }

  if ((material.watched_seconds || 0) < material.min_watch_seconds) {
    throw new HttpError(403, "Evaluasi masih terkunci sampai durasi minimum terpenuhi");
  }

  return { evaluation, material };
}

router.get(
  "/materials/:id/evaluations",
  requireAuth,
  requireRole("student", "admin"),
  asyncHandler(async (req, res) => {
    const material = await getAccessibleMaterial(req.user.id, Number(req.params.id));
    if (!material) {
      throw new HttpError(404, "Materi tidak ditemukan");
    }

    if ((material.watched_seconds || 0) < material.min_watch_seconds) {
      throw new HttpError(403, "Evaluasi masih terkunci sampai durasi minimum terpenuhi");
    }

    const evaluations = await query(
      `SELECT
          e.id,
          e.title,
          e.instructions,
          e.duration_limit_seconds,
          ea.id AS attempt_id,
          ea.status AS attempt_status,
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
        materialId: material.id
      }
    );

    res.json({ data: evaluations });
  })
);

router.get(
  "/evaluations/:id",
  requireAuth,
  requireRole("student", "admin"),
  asyncHandler(async (req, res) => {
    const { evaluation } = await assertEvaluationAccess(req.user.id, Number(req.params.id));
    const attempt = await queryOne(
      `SELECT id, status, score, submitted_at
       FROM evaluation_attempts
       WHERE evaluation_id = :evaluationId AND user_id = :userId
       LIMIT 1`,
      {
        evaluationId: evaluation.id,
        userId: req.user.id
      }
    );

    const questions = await query(
      `SELECT
          q.id,
          q.question_text,
          q.points,
          q.sort_order,
          qo.id AS option_id,
          qo.option_text,
          qo.sort_order AS option_sort_order
        FROM questions q
        INNER JOIN question_options qo ON qo.question_id = q.id
        WHERE q.evaluation_id = :evaluationId
        ORDER BY q.sort_order ASC, qo.sort_order ASC`,
      { evaluationId: evaluation.id }
    );

    const grouped = [];
    const byId = new Map();

    for (const row of questions) {
      if (!byId.has(row.id)) {
        const item = {
          id: row.id,
          questionText: row.question_text,
          points: row.points,
          sortOrder: row.sort_order,
          options: []
        };
        byId.set(row.id, item);
        grouped.push(item);
      }

      byId.get(row.id).options.push({
        id: row.option_id,
        optionText: row.option_text,
        sortOrder: row.option_sort_order
      });
    }

    res.json({
      data: {
        id: evaluation.id,
        materialId: evaluation.material_id,
        title: evaluation.title,
        instructions: evaluation.instructions,
        attempt,
        questions: grouped
      }
    });
  })
);

router.post(
  "/evaluations/:id/attempts",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const { evaluation } = await assertEvaluationAccess(req.user.id, Number(req.params.id));

    const existing = await queryOne(
      `SELECT id, status, submitted_at
       FROM evaluation_attempts
       WHERE evaluation_id = :evaluationId AND user_id = :userId
       LIMIT 1`,
      {
        evaluationId: evaluation.id,
        userId: req.user.id
      }
    );

    if (existing?.submitted_at) {
      throw new HttpError(409, "Evaluasi sudah pernah dikirim dan tidak dapat diulang");
    }

    if (existing) {
      return res.json({ data: existing });
    }

    const result = await query(
      `INSERT INTO evaluation_attempts
        (evaluation_id, user_id, started_at, submitted_at, duration_seconds, score, correct_count, status)
       VALUES (:evaluationId, :userId, UTC_TIMESTAMP(), NULL, NULL, 0, 0, 'in_progress')`,
      {
        evaluationId: evaluation.id,
        userId: req.user.id
      }
    );

    res.status(201).json({
      data: {
        id: result.insertId,
        status: "in_progress"
      }
    });
  })
);

router.post(
  "/attempts/:id/submit",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const payload = submitSchema.parse(req.body);

    const attempt = await queryOne(
      `SELECT ea.id, ea.evaluation_id, ea.user_id, ea.started_at, ea.submitted_at, ea.status
       FROM evaluation_attempts ea
       WHERE ea.id = :attemptId AND ea.user_id = :userId
       LIMIT 1`,
      {
        attemptId: Number(req.params.id),
        userId: req.user.id
      }
    );

    if (!attempt) {
      throw new HttpError(404, "Attempt tidak ditemukan");
    }

    if (attempt.submitted_at) {
      throw new HttpError(409, "Evaluasi sudah pernah dikirim");
    }

    const questions = await query(
      `SELECT
          q.id,
          q.question_text,
          q.points,
          qo.id AS option_id,
          qo.option_text,
          qo.is_correct
        FROM questions q
        INNER JOIN question_options qo ON qo.question_id = q.id
        WHERE q.evaluation_id = :evaluationId
        ORDER BY q.sort_order ASC, qo.sort_order ASC`,
      { evaluationId: attempt.evaluation_id }
    );

    const byQuestion = new Map();
    for (const row of questions) {
      if (!byQuestion.has(row.id)) {
        byQuestion.set(row.id, {
          id: row.id,
          questionText: row.question_text,
          points: row.points,
          options: []
        });
      }

      byQuestion.get(row.id).options.push({
        id: row.option_id,
        optionText: row.option_text,
        isCorrect: Boolean(row.is_correct)
      });
    }

    const answerMap = new Map(payload.answers.map((answer) => [answer.questionId, answer.selectedOptionId]));
    let score = 0;
    let correctCount = 0;

    await withTransaction(async (connection) => {
      for (const question of byQuestion.values()) {
        const selectedOptionId = answerMap.get(question.id) || null;
        const selectedOption = question.options.find((item) => item.id === selectedOptionId) || null;
        const isCorrect = Boolean(selectedOption?.isCorrect);
        const earnedPoints = isCorrect ? question.points : 0;

        if (isCorrect) {
          score += earnedPoints;
          correctCount += 1;
        }

        await connection.query(
          `INSERT INTO attempt_answers
            (attempt_id, question_id, selected_option_id, is_correct, earned_points, question_text_snapshot, option_text_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            attempt.id,
            question.id,
            selectedOptionId,
            isCorrect ? 1 : 0,
            earnedPoints,
            question.questionText,
            selectedOption?.optionText || null
          ]
        );
      }

      await connection.query(
        `UPDATE evaluation_attempts
         SET submitted_at = UTC_TIMESTAMP(),
             duration_seconds = TIMESTAMPDIFF(SECOND, started_at, UTC_TIMESTAMP()),
             score = ?,
             correct_count = ?,
             status = 'submitted'
         WHERE id = ?`,
        [score, correctCount, attempt.id]
      );
    });

    res.json({
      data: {
        attemptId: attempt.id,
        score,
        correctCount
      }
    });
  })
);

router.get(
  "/attempts/:id/result",
  requireAuth,
  requireRole("student", "admin"),
  asyncHandler(async (req, res) => {
    const attempt = await queryOne(
      `SELECT
          ea.id,
          ea.evaluation_id,
          ea.user_id,
          ea.started_at,
          ea.submitted_at,
          ea.duration_seconds,
          ea.score,
          ea.correct_count,
          e.title,
          m.id AS material_id,
          m.title AS material_title
        FROM evaluation_attempts ea
        INNER JOIN evaluations e ON e.id = ea.evaluation_id
        INNER JOIN materials m ON m.id = e.material_id
        WHERE ea.id = :attemptId
          AND (:isAdmin = 1 OR ea.user_id = :userId)
        LIMIT 1`,
      {
        attemptId: Number(req.params.id),
        userId: req.user.id,
        isAdmin: req.user.role === "admin" ? 1 : 0
      }
    );

    if (!attempt) {
      throw new HttpError(404, "Hasil evaluasi tidak ditemukan");
    }

    const answers = await query(
      `SELECT question_id, selected_option_id, is_correct, earned_points, question_text_snapshot, option_text_snapshot
       FROM attempt_answers
       WHERE attempt_id = :attemptId`,
      { attemptId: attempt.id }
    );

    res.json({
      data: {
        id: attempt.id,
        evaluationId: attempt.evaluation_id,
        evaluationTitle: attempt.title,
        materialId: attempt.material_id,
        materialTitle: attempt.material_title,
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at,
        durationSeconds: attempt.duration_seconds,
        score: attempt.score,
        correctCount: attempt.correct_count,
        answers
      }
    });
  })
);

export default router;
