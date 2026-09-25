import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { apiRequest } from "../api";

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [registration, setRegistration] = useState({ registrationOpen: false, message: "Memuat..." });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [navigate, user]);

  useEffect(() => {
    apiRequest("/auth/registration-status")
      .then(setRegistration)
      .catch(() => {
        setRegistration({ registrationOpen: false, message: "Pendaftaran belum tersedia" });
      });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const currentUser = await login(form.identifier, form.password);
      navigate(currentUser.role === "admin" ? "/admin" : "/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Masuk LMS</h1>
        <p>Login menggunakan email atau username.</p>
        <form onSubmit={handleSubmit} className="stack">
          <label>
            Email / Username
            <input
              value={form.identifier}
              onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : "Masuk"}
          </button>
        </form>
        <div className="info-box">
          <strong>Status pendaftaran:</strong> {registration.message}
        </div>
        {registration.registrationOpen ? (
          <Link className="secondary-button inline-button" to="/register">
            Daftar akun baru
          </Link>
        ) : (
          <div className="muted-text">Pendaftaran belum tersedia</div>
        )}
      </div>
    </div>
  );
}

