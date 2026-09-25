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

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return <div className="page-shell">Memuat dashboard...</div>;

  return (
    <div className="stack">
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">RINGKASAN BELAJAR</p>
          <h2>Perjalanan belajar Anda</h2>
          <p className="muted-text">Pantau materi, evaluasi, dan pencapaian Anda dari satu tempat.</p>
        </div>
        <Link className="primary-button inline-button" to="/materi">Lihat semua materi</Link>
      </section>

      <div className="grid-cards dashboard-stats">
        <div className="card stat-card">
          <span className="stat-label">Total materi</span>
          <strong>{data.totalMaterials}</strong>
          <span className="stat-help">Materi tersedia untuk Anda</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Sudah disimak</span>
          <strong>{data.completedMaterials}</strong>
          <span className="stat-help">Materi selesai</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Belum selesai</span>
          <strong>{data.remainingMaterials}</strong>
          <span className="stat-help">Materi yang perlu disimak</span>
        </div>
        <div className="card stat-card stat-card-accent">
          <span className="stat-label">Progres belajar</span>
          <strong>{data.progressPercent}%</strong>
          <span className="stat-help">Pencapaian keseluruhan</span>
        </div>
      </div>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MATERI</p>
            <h2>Materi terbaru</h2>
          </div>
          <Link to="/materi">Lihat semua</Link>
        </div>
        <div className="list">
          {data.latestMaterials.length === 0 && <div className="empty-state">Belum ada materi tersedia.</div>}
          {data.latestMaterials.map((item) => (
            <Link key={item.id} className="list-item dashboard-list-item" to={`/materi/${item.id}`}>
              <span>
                <strong className="item-title">{item.title}</strong>
                <span className="item-description">{item.completed_at ? "Materi sudah disimak" : "Materi belum disimak"}</span>
              </span>
              <span className={`badge ${item.completed_at ? "badge-complete" : "badge-pending"}`}>
                {item.completed_at ? "Sudah disimak" : "Belum disimak"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EVALUASI</p>
            <h2>Evaluasi siap dikerjakan</h2>
          </div>
        </div>
        <div className="list">
          {data.availableEvaluations.length === 0 && <div className="empty-state">Belum ada evaluasi terbuka.</div>}
          {data.availableEvaluations.map((item) => (
            <Link key={item.id} className="list-item dashboard-list-item" to={`/evaluasi/${item.id}`}>
              <span>
                <strong className="item-title">{item.title}</strong>
                <span className="item-description">Materi: {item.material_title}</span>
              </span>
              <span className="badge badge-pending">Belum dikerjakan</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid-cards">
        <div className="card">
          <div className="section-heading compact">
            <div><p className="eyebrow">PENCAPAIAN</p><h2>Hasil terakhir</h2></div>
          </div>
          {data.lastResult ? (
            <>
              <div className="item-description">{data.lastResult.title}</div>
              <strong>Skor {data.lastResult.score}</strong>
              <div className="stat-help">Waktu pengerjaan {data.lastResult.duration_seconds} detik</div>
              <Link className="secondary-button inline-button dashboard-card-action" to={`/hasil/${data.lastResult.id}`}>Lihat detail</Link>
            </>
          ) : <div className="empty-state">Belum ada hasil.</div>}
        </div>
        <div className="card">
          <div className="section-heading compact">
            <div><p className="eyebrow">PERINGKAT</p><h2>Peringkat saya</h2></div>
          </div>
          {data.currentRank ? (
            <>
              <strong>#{data.currentRank.position}</strong>
              <div className="stat-help">Skor total {data.currentRank.totalScore}</div>
              <Link className="secondary-button inline-button dashboard-card-action" to="/peringkat">Buka papan peringkat</Link>
            </>
          ) : <div className="empty-state">Belum masuk peringkat.</div>}
        </div>
      </section>
    </div>
  );
}
