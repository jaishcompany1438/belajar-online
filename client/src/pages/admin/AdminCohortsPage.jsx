import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

const emptyForm = {
  id: null,
  name: "",
  admissionYear: new Date().getFullYear(),
  status: "active"
};

export function AdminCohortsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setItems(await apiRequest("/admin/cohorts"));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (form.id) {
        await apiRequest(`/admin/cohorts/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(form)
        });
      } else {
        await apiRequest("/admin/cohorts", {
          method: "POST",
          body: JSON.stringify(form)
        });
      }
      setForm(emptyForm);
      setMessage("Angkatan berhasil disimpan.");
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="stack">
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      <form className="card stack" onSubmit={submit}>
        <h2>Kelola angkatan</h2>
        <div className="two-column">
          <label>
            Nama
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Tahun masuk
            <input
              type="number"
              value={form.admissionYear}
              onChange={(event) => setForm((current) => ({ ...current, admissionYear: Number(event.target.value) }))}
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit">
            Simpan
          </button>
          <button className="secondary-button" type="button" onClick={() => setForm(emptyForm)}>
            Reset
          </button>
        </div>
      </form>
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Tahun</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.admission_year}</td>
                <td>{item.status}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" onClick={() => setForm({
                      id: item.id,
                      name: item.name,
                      admissionYear: item.admission_year,
                      status: item.status
                    })}>
                      Edit
                    </button>
                    <button type="button" onClick={() => apiRequest(`/admin/cohorts/${item.id}`, { method: "DELETE" }).then(load)}>
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

