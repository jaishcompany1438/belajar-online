import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

export function AdminRegistrationPage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ registrationOpenAt: "", registrationCloseAt: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await apiRequest("/admin/registration-settings");
      setData(response);
      setForm({
        registrationOpenAt: response.current?.registration_open_at?.slice(0, 16) || "",
        registrationCloseAt: response.current?.registration_close_at?.slice(0, 16) || ""
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (!form.registrationOpenAt || !form.registrationCloseAt) {
        throw new Error("Waktu buka dan tutup wajib diisi.");
      }

      const openAt = new Date(form.registrationOpenAt);
      const closeAt = new Date(form.registrationCloseAt);
      if (Number.isNaN(openAt.getTime()) || Number.isNaN(closeAt.getTime()) || closeAt <= openAt) {
        throw new Error("Waktu tutup harus setelah waktu buka.");
      }

      await apiRequest("/admin/registration-settings", {
        method: "PUT",
        body: JSON.stringify({
          registrationOpenAt: openAt.toISOString(),
          registrationCloseAt: closeAt.toISOString()
        })
      });
      setMessage("Jadwal pendaftaran diperbarui.");
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function runAction(path) {
    setError("");
    setMessage("");
    try {
      await apiRequest(path, { method: "POST" });
      setMessage("Perubahan pendaftaran berhasil disimpan.");
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="stack">
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      <form className="card stack" onSubmit={save}>
        <h2>Pengaturan periode pendaftaran</h2>
        <div className="two-column">
          <label>
            Buka pendaftaran
            <input
              type="datetime-local"
              value={form.registrationOpenAt}
              onChange={(event) => setForm((current) => ({ ...current, registrationOpenAt: event.target.value }))}
            />
          </label>
          <label>
            Tutup pendaftaran
            <input
              type="datetime-local"
              value={form.registrationCloseAt}
              onChange={(event) => setForm((current) => ({ ...current, registrationCloseAt: event.target.value }))}
            />
          </label>
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit">
            Simpan jadwal
          </button>
          <button className="secondary-button" type="button" onClick={() => runAction("/admin/registration-settings/open-now")}>
            Buka sekarang
          </button>
          <button className="secondary-button" type="button" onClick={() => runAction("/admin/registration-settings/close-now")}>
            Tutup sekarang
          </button>
        </div>
      </form>
      <div className="card table-card">
        <h2>Riwayat perubahan</h2>
        <table>
          <thead>
            <tr>
              <th>Aksi</th>
              <th>Buka</th>
              <th>Tutup</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {(data?.logs || []).map((item) => (
              <tr key={item.id}>
                <td>{item.action}</td>
                <td>{item.new_open_at}</td>
                <td>{item.new_close_at}</td>
                <td>{item.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
