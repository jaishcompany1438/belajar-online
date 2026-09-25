import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";

export function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/materials")
      .then(setMaterials)
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  return (
    <div className="stack">
      <h2>Materi Saya</h2>
      <div className="grid-cards">
        {materials.map((item) => (
          <article key={item.id} className="card">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="muted-text">
              Wajib menyimak {item.minWatchSeconds} detik · tersimpan {item.watchedSeconds} detik
            </div>
            <div className="badge-row">
              <span className={`badge ${item.status === "completed" ? "badge-complete" : "badge-pending"}`}>
                {item.status === "completed" ? "Sudah disimak" : "Belum disimak"}
              </span>
            </div>
            <Link className="primary-button inline-button" to={`/materi/${item.id}`}>Buka materi</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
