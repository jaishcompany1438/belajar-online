import { useEffect, useState } from "react";
import { apiRequest } from "../api";

export function RankingsPage() {
  const [ranking, setRanking] = useState([]);
  const [me, setMe] = useState(null);
  const [filters, setFilters] = useState({ classId: "", cohortId: "" });
  const [options, setOptions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/auth/registration-status")
      .then((data) => setOptions(data.classes))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.classId) {
      params.set("classId", filters.classId);
    }
    if (filters.cohortId) {
      params.set("cohortId", filters.cohortId);
    }

    apiRequest(`/rankings${params.toString() ? `?${params.toString()}` : ""}`)
      .then((data) => {
        setRanking(data.ranking);
        setMe(data.me);
      })
      .catch((requestError) => setError(requestError.message));
  }, [filters]);

  return (
    <div className="stack">
      <div className="card">
        <h2>Peringkat</h2>
        <div className="two-column">
          <label>
            Filter kelas
            <select
              value={filters.classId}
              onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value }))}
            >
              <option value="">Semua kelas</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.admissionYear})
                </option>
              ))}
            </select>
          </label>
          <label>
            Filter angkatan
            <select
              value={filters.cohortId}
              onChange={(event) => setFilters((current) => ({ ...current, cohortId: event.target.value }))}
            >
              <option value="">Semua angkatan</option>
              {[...new Map(options.map((item) => [item.cohortId, item])).values()].map((item) => (
                <option key={item.cohortId} value={item.cohortId}>
                  {item.cohortName} ({item.admissionYear})
                </option>
              ))}
            </select>
          </label>
        </div>
        {me && (
          <div className="info-box">
            Posisi Anda: #{me.position} · Skor {me.totalScore} · Durasi {me.totalDuration} detik
          </div>
        )}
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Peserta</th>
              <th>Skor</th>
              <th>Total Benar</th>
              <th>Durasi</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((item) => (
              <tr key={item.userId}>
                <td>{item.position}</td>
                <td>{item.fullName}</td>
                <td>{item.totalScore}</td>
                <td>{item.totalCorrect}</td>
                <td>{item.totalDuration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

