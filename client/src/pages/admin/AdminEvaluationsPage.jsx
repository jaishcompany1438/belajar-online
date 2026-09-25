import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

const sampleQuestions = JSON.stringify(
  [
    {
      questionText: "Apa hukum membaca basmalah di awal surah?",
      points: 10,
      sortOrder: 1,
      options: [
        { optionText: "Sunnah", isCorrect: true, sortOrder: 1 },
        { optionText: "Makruh", isCorrect: false, sortOrder: 2 }
      ]
    }
  ],
  null,
  2
);

const emptyForm = {
  id: null,
  materialId: "",
  title: "",
  instructions: "",
  durationLimitSeconds: 900,
  status: "draft",
  questionsJson: sampleQuestions
};

export function AdminEvaluationsPage() {
  const [materials, setMaterials] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [materialData, evaluationData] = await Promise.all([
        apiRequest("/admin/materials"),
        apiRequest("/admin/evaluations")
      ]);
      setMaterials(materialData);
      setEvaluations(evaluationData);
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
      const payload = {
        materialId: Number(form.materialId),
        title: form.title,
        instructions: form.instructions,
        durationLimitSeconds: Number(form.durationLimitSeconds),
        status: form.status,
        questions: JSON.parse(form.questionsJson)
      };

      if (form.id) {
        await apiRequest(`/admin/evaluations/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest("/admin/evaluations", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setForm(emptyForm);
      setMessage("Evaluasi berhasil disimpan.");
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
        <h2>Kelola evaluasi</h2>
        <div className="two-column">
          <label>
            Materi
            <select value={form.materialId} onChange={(event) => setForm((current) => ({ ...current, materialId: event.target.value }))}>
              <option value="">Pilih materi</option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Judul
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            Durasi batas (detik)
            <input
              type="number"
              value={form.durationLimitSeconds}
              onChange={(event) => setForm((current) => ({ ...current, durationLimitSeconds: event.target.value }))}
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="full-span">
            Instruksi
            <textarea value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} />
          </label>
          <label className="full-span">
            Soal (JSON)
            <textarea
              rows={16}
              value={form.questionsJson}
              onChange={(event) => setForm((current) => ({ ...current, questionsJson: event.target.value }))}
            />
          </label>
        </div>
        <div className="action-row">
          <button className="primary-button" type="submit">
            Simpan evaluasi
          </button>
          <button className="secondary-button" type="button" onClick={() => setForm(emptyForm)}>
            Reset
          </button>
        </div>
      </form>
      <div className="card table-card">
        <h2>Daftar evaluasi</h2>
        <table>
          <thead>
            <tr>
              <th>Judul</th>
              <th>Materi</th>
              <th>Status</th>
              <th>Soal</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.material_title}</td>
                <td>{item.status}</td>
                <td>{item.question_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

