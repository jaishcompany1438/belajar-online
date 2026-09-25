import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

const emptyForm = {
  id: null,
  name: "",
  cohortId: "",
  description: "",
  status: "active"
};

export function AdminClassesPage() {
  const [classes, setClasses] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [classData, cohortData] = await Promise.all([
        apiRequest("/admin/classes"),
        apiRequest("/admin/cohorts")
      ]);
      setClasses(classData);
      setCohorts(cohortData);
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
      const payload = { ...form, cohortId: Number(form.cohortId) };
      if (form.id) {
        await apiRequest(`/admin/classes/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest("/admin/classes", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setForm(emptyForm);
      setMessage("Kelas berhasil disimpan.");
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
        <h2>Kelola kelas</h2>
        <div className="two-column">
          <label>
            Nama kelas
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            Angkatan
            <select value={form.cohortId} onChange={(event) => setForm((current) => ({ ...current, cohortId: event.target.value }))}>
              <option value="">Pilih angkatan</option>
              {cohorts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.admission_year})
                </option>
              ))}
            </select>
          </label>
          <label className="full-span">
            Deskripsi
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
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
              <th>Angkatan</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.cohort_name} ({item.admission_year})</td>
                <td>{item.status}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" onClick={() => setForm({
                      id: item.id,
                      name: item.name,
                      cohortId: item.cohort_id,
                      description: item.description || "",
                      status: item.status
                    })}>
                      Edit
                    </button>
                    <button type="button" onClick={() => apiRequest(`/admin/classes/${item.id}`, { method: "DELETE" }).then(load)}>
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

