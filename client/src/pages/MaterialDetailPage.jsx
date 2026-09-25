import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api";

export function MaterialDetailPage() {
  const { id } = useParams();
  const [material, setMaterial] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState("");
  const heartbeatRef = useRef(null);

  useEffect(() => {
    apiRequest(`/materials/${id}`)
      .then(setMaterial)
      .catch((requestError) => setError(requestError.message));
  }, [id]);

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
      }
      if (sessionId) {
        apiRequest(`/watch-sessions/${sessionId}/finish`, { method: "POST" }).catch(() => {});
      }
    };
  }, [sessionId]);

  async function startWatching() {
    setError("");
    try {
      const session = await apiRequest(`/materials/${id}/watch-sessions`, { method: "POST" });
      setSessionId(session.id);
      setWatching(true);
      heartbeatRef.current = window.setInterval(async () => {
        if (document.visibilityState !== "visible") {
          return;
        }
        const progress = await apiRequest(`/watch-sessions/${session.id}/heartbeat`, {
          method: "POST",
          body: JSON.stringify({ watchedSeconds: 15 })
        });
        setMaterial((current) =>
          current
            ? {
                ...current,
                watchedSeconds: progress.watchedSeconds,
                completedAt: progress.completedAt,
                evaluationUnlocked: progress.completed
              }
            : current
        );
      }, 15000);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function stopWatching() {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (sessionId) {
      await apiRequest(`/watch-sessions/${sessionId}/finish`, { method: "POST" });
      setSessionId(null);
    }
    setWatching(false);
  }

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  if (!material) {
    return <div className="page-shell">Memuat materi...</div>;
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>{material.title}</h2>
        <p>{material.description}</p>
        <div className="muted-text">
          Progress tersimpan {material.watchedSeconds} / {material.minWatchSeconds} detik
        </div>
        <div className="video-frame">
          <iframe
            title={material.title}
            src={`https://www.youtube.com/embed/${material.youtubeVideoId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="action-row">
          {!watching ? (
            <button className="primary-button" type="button" onClick={startWatching}>
              Mulai menyimak
            </button>
          ) : (
            <button className="secondary-button" type="button" onClick={stopWatching}>
              Hentikan sesi
            </button>
          )}
        </div>
      </div>
      <div className="card">
        <h3>Evaluasi materi</h3>
        {!material.evaluationUnlocked && (
          <div className="info-box">Evaluasi akan terbuka setelah durasi minimum terpenuhi.</div>
        )}
        <div className="list">
          {material.evaluations.map((item) => (
            <div key={item.id} className="list-item">
              <div>
                <strong>{item.title}</strong>
                <div className="muted-text">{item.instructions}</div>
              </div>
              {item.submittedAt ? (
                <Link to={`/hasil/${item.attemptId}`}>Lihat hasil</Link>
              ) : material.evaluationUnlocked ? (
                <Link to={`/evaluasi/${item.id}`}>Mulai evaluasi</Link>
              ) : (
                <span className="muted-text">Terkunci</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
