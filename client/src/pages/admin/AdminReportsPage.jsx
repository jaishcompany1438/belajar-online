import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

export function AdminReportsPage() {
  const [progress, setProgress] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest("/admin/reports/progress"),
      apiRequest("/admin/reports/results")
    ])
      .then(([progressData, resultData]) => {
        setProgress(progressData);
        setResults(resultData);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <div className="stack">
      {error && <div className="error-box">{error}</div>}
      <div className="card table-card">
        <h2>Laporan progres menyimak</h2>
        <table>
          <thead>
            <tr>
              <th>Peserta</th>
              <th>Materi</th>
              <th>Progress</th>
              <th>Selesai</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((item, index) => (
              <tr key={`${item.full_name}-${index}`}>
                <td>{item.full_name}</td>
                <td>{item.material_title}</td>
                <td>{item.watched_seconds} / {item.min_watch_seconds}</td>
                <td>{item.completed_at || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card table-card">
        <h2>Laporan hasil evaluasi</h2>
        <table>
          <thead>
            <tr>
              <th>Peserta</th>
              <th>Materi</th>
              <th>Evaluasi</th>
              <th>Skor</th>
              <th>Durasi</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, index) => (
              <tr key={`${item.full_name}-${index}`}>
                <td>{item.full_name}</td>
                <td>{item.material_title}</td>
                <td>{item.evaluation_title}</td>
                <td>{item.score} / {item.correct_count}</td>
                <td>{item.duration_seconds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

