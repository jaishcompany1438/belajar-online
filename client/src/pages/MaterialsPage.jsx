import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";

export function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/materials?page=${page}&limit=12`)
      .then((data) => {
        setMaterials(data.items);
        setPagination(data.pagination);
      })
      .catch((requestError) => setError(requestError.message));
  }, [page]);

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
      {pagination.totalPages > 1 && (
        <nav className="pagination" aria-label="Navigasi halaman materi">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setPage((currentPage) => currentPage - 1)}
            disabled={page <= 1}
          >
            Sebelumnya
          </button>
          <span className="pagination-status">
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setPage((currentPage) => currentPage + 1)}
            disabled={page >= pagination.totalPages}
          >
            Berikutnya
          </button>
        </nav>
      )}
    </div>
  );
}
