import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/dashboard")
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  if (!data) {
    return <div className="page-shell">Memuat dashboard...</div>;
  }

  return (
    <div className="stack">
      <div className="grid-cards">
        <div className="card">
          <h3>Total materi</h3>
          <strong>{data.totalMaterials}</strong>
        </div>
        <div className="card">
          <h3>Selesai</h3>
          <strong>{data.completedMaterials}</strong>
        </div>
        <div className="card">
          <h3>Belum selesai</h3>
          <strong>{data.remainingMaterials}</strong>
        </div>
        <div className="card">
          <h3>Progres</h3>
          <strong>{data.progressPercent}%</strong>
        </div>
      </div>

      <section className="card">
        <h2>Materi terbaru</h2>
        <div className="list">
          {data.latestMaterials.map((item) => (
            <Link key={item.id} className="list-item" to={`/materi/${item.id}`}>
              <span>{item.title}</span>
              <span>{item.completed_at ? "Selesai" : `${item.watched_seconds || 0} detik`}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Evaluasi siap dikerjakan</h2>
        <div className="list">
          {data.availableEvaluations.length === 0 && <div className="muted-text">Belum ada evaluasi terbuka.</div>}
          {data.availableEvaluations.map((item) => (
            <Link key={item.id} className="list-item" to={`/evaluasi/${item.id}`}>
              <span>{item.title}</span>
              <span>{item.material_title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid-cards">
        <div className="card">
          <h2>Hasil terakhir</h2>
          {data.lastResult ? (
            <>
              <div>{data.lastResult.title}</div>
              <strong>Skor {data.lastResult.score}</strong>
              <div>{data.lastResult.duration_seconds} detik</div>
              <Link to={`/hasil/${data.lastResult.id}`}>Lihat detail</Link>
            </>
          ) : (
            <div className="muted-text">Belum ada hasil.</div>
          )}
        </div>
        <div className="card">
          <h2>Peringkat saya</h2>
          {data.currentRank ? (
            <>
              <strong>#{data.currentRank.position}</strong>
              <div>Skor total {data.currentRank.totalScore}</div>
              <Link to="/peringkat">Buka papan peringkat</Link>
            </>
          ) : (
            <div className="muted-text">Belum masuk peringkat.</div>
          )}
        </div>
      </section>
    </div>
  );
}

