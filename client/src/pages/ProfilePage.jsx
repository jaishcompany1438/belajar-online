import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { useAuth } from "../auth";

export function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState({ oldPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/me")
      .then(setProfile)
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiRequest("/me", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: profile.fullName,
          email: profile.email,
          bio: profile.bio || "",
          phone: profile.phone || ""
        })
      });
      await refreshUser();
      setMessage("Profil berhasil diperbarui.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(password)
      });
      setPassword({ oldPassword: "", newPassword: "" });
      setMessage("Password berhasil diperbarui.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!profile) {
    return <div className="page-shell">Memuat profil...</div>;
  }

  return (
    <div className="stack">
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      <form className="card stack" onSubmit={saveProfile}>
        <h2>Profil</h2>
        <div className="two-column">
          <label>
            Nama lengkap
            <input
              value={profile.fullName || ""}
              onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={profile.email || ""}
              onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label>
            Telepon
            <input
              value={profile.phone || ""}
              onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
          <label>
            Username
            <input value={profile.username || ""} disabled />
          </label>
          <label className="full-span">
            Motivasi belajar di Thobari Academy
            <textarea
              value={profile.bio || ""}
              onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
            />
          </label>
        </div>
        <div className="muted-text">
          Kelas: {profile.classes.map((item) => `${item.name} (${item.admissionYear})`).join(", ")}
        </div>
        <button className="primary-button" type="submit">
          Simpan profil
        </button>
      </form>
      <form className="card stack" onSubmit={savePassword}>
        <h2>Ubah password</h2>
        <div className="two-column">
          <label>
            Password lama
            <input
              type="password"
              value={password.oldPassword}
              onChange={(event) => setPassword((current) => ({ ...current, oldPassword: event.target.value }))}
            />
          </label>
          <label>
            Password baru
            <input
              type="password"
              minLength={8}
              value={password.newPassword}
              onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))}
            />
          </label>
        </div>
        <button className="primary-button" type="submit">
          Ubah password
        </button>
      </form>
    </div>
  );
}
