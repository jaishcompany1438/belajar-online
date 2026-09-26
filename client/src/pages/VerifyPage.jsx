import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api";

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = searchParams.get("token") || "";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const result = await apiRequest("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ token, code })
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img className="auth-logo" src="/logo_bel_on.svg" alt="Logo Thobari Academy" />
        <h1>Verifikasi email</h1>
        <p>Masukkan nomor verifikasi yang dikirim ke email Anda.</p>
        {error && <div className="error-box">{error}</div>}
        {message ? (
          <div className="stack">
            <div className="success-box">{message}</div>
            <Link className="primary-button inline-button" to="/login">Ke halaman login</Link>
          </div>
        ) : (
          <form className="stack" onSubmit={submit}>
            <label>
              Nomor verifikasi
              <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" pattern="\d{6}" maxLength={6} required />
            </label>
            <button className="primary-button" type="submit" disabled={!token || submitting}>
              {submitting ? "Memverifikasi..." : "Verifikasi akun"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
