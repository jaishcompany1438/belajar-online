import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

const emptyForm = {
  id: null,
  title: "",
  description: "",
  youtubeUrl: "",
  thumbnailUrl: "",
  publishAt: "",
  minWatchSeconds: 180,
  status: "draft",
  targetClassIds: [],
  targetCohortIds: []
};

export function AdminMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [classes, setClasses] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [materialData, classData, cohortData] = await Promise.all([
        apiRequest("/admin/materials"),
        apiRequest("/admin/classes"),
        apiRequest("/admin/cohorts")
      ]);
      setMaterials(materialData);
      setClasses(classData);
      setCohorts(cohortData);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleArray(field, id) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((item) => item !== id)
        : [...current[field], id]
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        publishAt: new Date(form.publishAt).toISOString()
      };
      if (form.id) {
        await apiRequest(`/admin/materials/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest("/admin/materials", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setForm(emptyForm);
      setMessage("Materi berhasil disimpan.");
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
        <h2>{form.id ? "Edit materi" : "Tambah materi"}</h2>
        <div className="two-column">
          <label>
            Judul
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            YouTube URL / video ID
            <input value={form.youtubeUrl} onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))} />
          </label>
          <label className="full-span">
            Deskripsi
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label>
            Thumbnail URL
            <input value={form.thumbnailUrl} onChange={(event) => setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))} />
          </label>
          <label>
            Publish at
            <input type="datetime-local" value={form.publishAt} onChange={(event) => setForm((current) => ({ ...current, publishAt: event.target.value }))} />
          </label>
          <label>
            Minimum detik
            <input
              type="number"
              value={form.minWatchSeconds}
              onChange={(event) => setForm((current) => ({ ...current, minWatchSeconds: Number(event.target.value) }))}
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <div className="two-column">
          <div>
            <strong>Target kelas</strong>
            <div className="checkbox-list">
              {classes.map((item) => (
                <label key={item.id} className="checkbox-item">
                  <input type="checkbox" checked={form.targetClassIds.includes(item.id)} onChange={() => toggleArray("targetClassIds", item.id)} />
                  {item.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <strong>Target angkatan</strong>
            <div className="checkbox-list">
              {cohorts.map((item) => (
                <label key={item.id} className="checkbox-item">
                  <input type="checkbox" checked={form.targetCohortIds.includes(item.id)} onChange={() => toggleArray("targetCohortIds", item.id)} />
                  {item.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit">
            Simpan materi
          </button>
          <button className="secondary-button" type="button" onClick={() => setForm(emptyForm)}>
            Reset
          </button>
        </div>
      </form>
      <div className="card table-card">
        <h2>Daftar materi</h2>
        <table>
          <thead>
            <tr>
              <th>Judul</th>
              <th>Status</th>
              <th>Publish</th>
              <th>Target</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.status}</td>
                <td>{item.publish_at}</td>
                <td>
                  {item.targets.map((target) => {
                    if (target.classId) {
                      const classItem = classes.find((classOption) => classOption.id === target.classId);
                      return classItem?.name;
                    }
                    const cohortItem = cohorts.find((cohortOption) => cohortOption.id === target.cohortId);
                    return cohortItem?.name;
                  }).filter(Boolean).join(", ")}
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: item.id,
                          title: item.title,
                          description: item.description,
                          youtubeUrl: item.youtube_url,
                          thumbnailUrl: item.thumbnail_url || "",
                          publishAt: item.publish_at?.slice(0, 16) || "",
                          minWatchSeconds: item.min_watch_seconds,
                          status: item.status,
                          targetClassIds: item.targets.filter((target) => target.classId).map((target) => target.classId),
                          targetCohortIds: item.targets.filter((target) => target.cohortId).map((target) => target.cohortId)
                        })
                      }
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => apiRequest(`/admin/materials/${item.id}`, { method: "DELETE" }).then(load)}>
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

