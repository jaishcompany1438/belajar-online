import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../api";

export function ResultPage() {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/attempts/${attemptId}/result`)
      .then(setResult)
      .catch((requestError) => setError(requestError.message));
  }, [attemptId]);

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  if (!result) {
    return <div className="page-shell">Memuat hasil...</div>;
  }

  return (
    <div className="stack">
      <div className="grid-cards">
        <div className="card">
          <h3>Skor</h3>
          <strong>{result.score}</strong>
        </div>
        <div className="card">
          <h3>Jawaban benar</h3>
          <strong>{result.correctCount}</strong>
        </div>
        <div className="card">
          <h3>Durasi</h3>
          <strong>{result.durationSeconds} detik</strong>
        </div>
      </div>
      <div className="card">
        <h2>{result.evaluationTitle}</h2>
        <p>Materi: {result.materialTitle}</p>
        <div className="list">
          {result.answers.map((answer) => (
            <div key={`${answer.question_id}-${answer.selected_option_id}`} className="list-item">
              <div>
                <strong>{answer.question_text_snapshot}</strong>
                <div className="muted-text">{answer.option_text_snapshot || "Tidak dijawab"}</div>
              </div>
              <span className={answer.is_correct ? "success-text" : "error-text"}>
                {answer.is_correct ? `Benar (+${answer.earned_points})` : "Salah"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

