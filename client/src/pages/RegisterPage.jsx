import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";

export function RegisterPage() {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    bio: "",
    classIds: []
  });

  useEffect(() => {
    apiRequest("/auth/registration-status")
      .then(setStatus)
      .catch(() => setStatus({ registrationOpen: false, message: "Pendaftaran belum tersedia", classes: [] }));
  }, []);

  function toggleClass(classId) {
    setForm((current) => ({
      ...current,
      classIds: current.classIds.includes(classId)
        ? current.classIds.filter((item) => item !== classId)
        : [...current.classIds, classId]
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage("Pendaftaran berhasil. Silakan cek email untuk mendapatkan kode verifikasi.");
      setForm({
        fullName: "",
        email: "",
        username: "",
        password: "",
        phone: "",
        bio: "",
        classIds: []
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!status) {
    return <div className="page-shell">Memuat status pendaftaran...</div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <img className="auth-logo" src="/logo_bel_on.svg" alt="Logo Thobari Academy" />
        <h1>Pendaftaran Peserta</h1>
        <p>{status.message}</p>
        {!status.registrationOpen ? (
          <div className="stack">
            <div className="error-box">Pendaftaran belum tersedia</div>
            <Link className="secondary-button inline-button" to="/login">
              Kembali ke login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            <div className="two-column">
              <label>
                Nama lengkap
                <input
                  required
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Username
                <input
                  required
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label>
                No. telepon
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                Motivasi belajar di Thobari Academy
                <textarea
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                />
              </label>
            </div>
            <div>
              <strong>Pilih kelas</strong>
              <div className="checkbox-list">
                {status.classes.map((item) => (
                  <label key={item.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.classIds.includes(item.id)}
                      onChange={() => toggleClass(item.id)}
                    />
                    {item.name} - {item.cohortName} ({item.admissionYear})
                  </label>
                ))}
              </div>
            </div>
            {error && <div className="error-box">{error}</div>}
            {message && <div className="success-box">{message}</div>}
            <div className="action-row">
              <button className="primary-button" type="submit">
                Kirim pendaftaran
              </button>
              <Link className="secondary-button inline-button" to="/login">
                Kembali ke login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
