import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api";

export function MaterialDetailPage() {
  const { id } = useParams();
  const [material, setMaterial] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [watching, setWatching] = useState(false);
  const [displayWatchedSeconds, setDisplayWatchedSeconds] = useState(0);
  const [error, setError] = useState("");
  const heartbeatRef = useRef(null);
  const tickRef = useRef(null);
  const sessionRef = useRef(null);
  const watchedRef = useRef(0);
  const serverWatchedRef = useRef(0);
  const minWatchRef = useRef(0);
  const completedRef = useRef(false);
  const startingRef = useRef(false);
  const heartbeatInFlightRef = useRef(false);

  useEffect(() => {
    apiRequest(`/materials/${id}`)
      .then((data) => {
        const completed = Boolean(data.completedAt) && data.watchedSeconds >= data.minWatchSeconds;
        setMaterial(data);
        watchedRef.current = completed ? data.watchedSeconds : 0;
        serverWatchedRef.current = watchedRef.current;
        minWatchRef.current = data.minWatchSeconds;
        setDisplayWatchedSeconds(watchedRef.current);
        completedRef.current = completed;
        if (!completed) {
          startWatching();
        }
      })
      .catch((requestError) => setError(requestError.message));
  }, [id]);

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
      }
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
      }
      if (sessionRef.current && !completedRef.current) {
        apiRequest(`/watch-sessions/${sessionRef.current}/finish`, { method: "POST" }).catch(() => {});
      }
    };
  }, [id]);

  async function startWatching() {
    if (startingRef.current || sessionRef.current || completedRef.current) {
      return;
    }

    startingRef.current = true;
    setError("");
    try {
      const session = await apiRequest(`/materials/${id}/watch-sessions`, { method: "POST" });
      sessionRef.current = session.id;
      setSessionId(session.id);
      setWatching(true);
      const sendHeartbeat = async () => {
        if (
          heartbeatInFlightRef.current ||
          document.visibilityState !== "visible" ||
          completedRef.current ||
          !sessionRef.current
        ) {
          return;
        }

        const remaining = Math.max(0, minWatchRef.current - serverWatchedRef.current);
        if (remaining === 0) {
          await completeWatching();
          return;
        }

        heartbeatInFlightRef.current = true;
        try {
          const progress = await apiRequest(`/watch-sessions/${sessionRef.current}/heartbeat`, {
            method: "POST",
            body: JSON.stringify({ watchedSeconds: Math.min(15, remaining) })
          });
          watchedRef.current = progress.watchedSeconds;
          serverWatchedRef.current = progress.watchedSeconds;
          setDisplayWatchedSeconds(progress.watchedSeconds);
          setMaterial((current) => current ? {
            ...current,
            watchedSeconds: progress.watchedSeconds,
            completedAt: progress.completedAt,
            evaluationUnlocked: progress.completed && progress.watchedSeconds >= minWatchRef.current
          } : current);

          if (progress.completed && progress.watchedSeconds >= minWatchRef.current) {
            await completeWatching();
          }
        } catch (requestError) {
          setError(requestError.message);
        } finally {
          heartbeatInFlightRef.current = false;
        }
      };
      tickRef.current = window.setInterval(() => {
        if (document.visibilityState !== "visible" || completedRef.current) {
          return;
        }

        const nextSeconds = Math.min(
          watchedRef.current + 1,
          minWatchRef.current || watchedRef.current + 1
        );
        watchedRef.current = nextSeconds;
        setDisplayWatchedSeconds(nextSeconds);
        if (nextSeconds >= minWatchRef.current) {
          sendHeartbeat();
        }
      }, 1000);
      heartbeatRef.current = window.setInterval(sendHeartbeat, 15000);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      startingRef.current = false;
    }
  }

  async function completeWatching() {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    completedRef.current = true;
    if (sessionRef.current) {
      await apiRequest(`/watch-sessions/${sessionRef.current}/finish`, { method: "POST" });
      sessionRef.current = null;
      setSessionId(null);
    }
    setWatching(false);
    setMaterial((current) => current ? {
      ...current,
      watchedSeconds: minWatchRef.current,
      completedAt: new Date().toISOString(),
      evaluationUnlocked: true
    } : current);
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
        <h2 className="material-title">{material.title}</h2>
        <p className="material-description">{material.description}</p>
        <div className="watch-status">
          <span className={`badge ${material.completedAt && displayWatchedSeconds >= material.minWatchSeconds ? "badge-complete" : "badge-pending"}`}>
            {material.completedAt && displayWatchedSeconds >= material.minWatchSeconds ? "Sudah disimak" : "Belum disimak"}
          </span>
          <strong>
            {material.completedAt && displayWatchedSeconds >= material.minWatchSeconds
              ? "Materi sudah selesai disimak"
              : "Sedang menyimak otomatis"}
          </strong>
          <span className="watch-countdown">
            {material.completedAt && displayWatchedSeconds >= material.minWatchSeconds
              ? "Selesai"
              : `Sisa waktu ${Math.max(0, material.minWatchSeconds - displayWatchedSeconds)} detik`}
          </span>
          <div className="watch-progress-track">
            <span style={{ width: `${Math.min(100, (displayWatchedSeconds / material.minWatchSeconds) * 100)}%` }} />
          </div>
          <span className="muted-text">
            {displayWatchedSeconds} / {material.minWatchSeconds} detik
          </span>
        </div>
        <div className="video-frame">
          <iframe
            title={material.title}
            src={`https://www.youtube.com/embed/${material.youtubeVideoId}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {watching && <div className="info-box">Timer berjalan otomatis selama halaman ini aktif. Anda tidak perlu menekan tombol mulai.</div>}
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
                <div className="action-row">
                  <span className="badge badge-complete">Sudah dikerjakan</span>
                  <Link className="secondary-button inline-button" to={`/hasil/${item.attemptId}`}>Lihat hasil</Link>
                </div>
              ) : material.evaluationUnlocked ? (
                <Link className="primary-button inline-button" to={`/evaluasi/${item.id}`}>Kerjakan evaluasi</Link>
              ) : (
                <span className="badge badge-pending">Belum dikerjakan</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
