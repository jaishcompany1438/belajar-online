import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

const emptyForm = {
  id: null,
  fullName: "",
  email: "",
  username: "",
  password: "",
  role: "student",
  status: "pending",
  bio: "",
  phone: "",
  classIds: []
};

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [userData, classData] = await Promise.all([
        apiRequest("/admin/users"),
        apiRequest("/admin/classes")
      ]);
      setUsers(userData);
      setClasses(classData);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleClass(classId) {
    setForm((current) => ({
      ...current,
      classIds: current.classIds.includes(classId)
        ? current.classIds.filter((item) => item !== classId)
        : [...current.classIds, classId]
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        classIds: form.classIds
      };
      if (!form.password) {
        delete payload.password;
      }
      if (form.id) {
        await apiRequest(`/admin/users/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest("/admin/users", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setForm(emptyForm);
      setMessage("Data peserta berhasil disimpan.");
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function runAction(path, method = "POST") {
    setError("");
    setMessage("");
    try {
      await apiRequest(path, { method });
      setMessage("Aksi berhasil.");
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
        <h2>{form.id ? "Edit peserta" : "Tambah peserta"}</h2>
        <div className="two-column">
          <label>
            Nama lengkap
            <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label>
            Username
            <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>
        <label>
          Bio
          <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} />
        </label>
        <label>
          Telepon
          <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
        </label>
        <div>
          <strong>Kelas</strong>
          <div className="checkbox-list">
            {classes.map((item) => (
              <label key={item.id} className="checkbox-item">
                <input type="checkbox" checked={form.classIds.includes(item.id)} onChange={() => toggleClass(item.id)} />
                {item.name} ({item.admission_year})
              </label>
            ))}
          </div>
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit">
            Simpan peserta
          </button>
          <button className="secondary-button" type="button" onClick={() => setForm(emptyForm)}>
            Reset
          </button>
        </div>
      </form>
      <div className="card table-card">
        <h2>Daftar pengguna</h2>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Login</th>
              <th>Status</th>
              <th>Kelas</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.fullName}</td>
                <td>
                  {item.email}
                  <div className="muted-text">@{item.username}</div>
                </td>
                <td>{item.status}</td>
                <td>{item.classes.map((classItem) => classItem.name).join(", ")}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" onClick={() => setForm({
                      id: item.id,
                      fullName: item.fullName,
                      email: item.email,
                      username: item.username,
                      password: "",
                      role: item.role,
                      status: item.status,
                      bio: item.bio || "",
                      phone: item.phone || "",
                      classIds: item.classes.map((classItem) => classItem.id)
                    })}>
                      Edit
                    </button>
                    {item.status === "pending" && (
                      <>
                        <button type="button" onClick={() => runAction(`/admin/users/${item.id}/approve`)}>
                          Approve
                        </button>
                        <button type="button" onClick={() => runAction(`/admin/users/${item.id}/reject`)}>
                          Reject
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => runAction(`/admin/users/${item.id}`, "DELETE")}>
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

