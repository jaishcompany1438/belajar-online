import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api";

export function EvaluationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const detail = await apiRequest(`/evaluations/${id}`);
        setEvaluation(detail);
        if (detail.attempt?.submitted_at) {
          navigate(`/hasil/${detail.attempt.id}`);
          return;
        }
        if (!detail.attempt) {
          const createdAttempt = await apiRequest(`/evaluations/${id}/attempts`, { method: "POST" });
          setEvaluation((current) => ({ ...current, attempt: createdAttempt }));
        }
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    load();
  }, [id, navigate]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await apiRequest(`/attempts/${evaluation.attempt.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
            questionId: Number(questionId),
            selectedOptionId: Number(selectedOptionId)
          }))
        })
      });
      navigate(`/hasil/${data.attemptId}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  if (!evaluation) {
    return <div className="page-shell">Memuat evaluasi...</div>;
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="card">
        <h2>{evaluation.title}</h2>
        <p>{evaluation.instructions || "Pilih satu jawaban terbaik untuk setiap soal."}</p>
        <div className="muted-text">
          Terjawab {answeredCount} dari {evaluation.questions.length} soal
        </div>
      </div>
      {evaluation.questions.map((question) => (
        <section key={question.id} className="card">
          <h3>{question.questionText}</h3>
          <div className="stack">
            {question.options.map((option) => (
              <label key={option.id} className="radio-item">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={Number(answers[question.id]) === option.id}
                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                />
                {option.optionText}
              </label>
            ))}
          </div>
        </section>
      ))}
      {error && <div className="error-box">{error}</div>}
      <div className="action-row">
        <button className="primary-button" type="submit">
          Kirim evaluasi
        </button>
        <Link className="secondary-button inline-button" to={`/materi/${evaluation.materialId || ""}`}>
          Kembali
        </Link>
      </div>
    </form>
  );
}

