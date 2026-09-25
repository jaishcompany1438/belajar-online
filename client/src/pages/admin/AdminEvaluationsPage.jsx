import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

function createQuestion(sortOrder = 1) {
  return {
    questionText: "",
    points: 1,
    sortOrder,
    options: [
      { optionText: "", isCorrect: true, sortOrder: 1 },
      { optionText: "", isCorrect: false, sortOrder: 2 }
    ]
  };
}

const emptyForm = {
  id: null,
  materialId: "",
  title: "",
  instructions: "",
  durationLimitSeconds: 900,
  status: "draft",
  questions: [createQuestion()]
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

  function updateQuestion(questionIndex, changes) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, ...changes } : question
      )
    }));
  }

  function updateOption(questionIndex, optionIndex, changes) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? { ...option, ...changes } : option
              )
            }
          : question
      )
    }));
  }

  function setCorrectOption(questionIndex, optionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) => ({
                ...option,
                isCorrect: currentOptionIndex === optionIndex
              }))
            }
          : question
      )
    }));
  }

  function addQuestion() {
    setForm((current) => ({
      ...current,
      questions: [...current.questions, createQuestion(current.questions.length + 1)]
    }));
  }

  function removeQuestion(questionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions
        .filter((_, index) => index !== questionIndex)
        .map((question, index) => ({ ...question, sortOrder: index + 1 }))
    }));
  }

  function addOption(questionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: [
                ...question.options,
                {
                  optionText: "",
                  isCorrect: false,
                  sortOrder: question.options.length + 1
                }
              ]
            }
          : question
      )
    }));
  }

  function removeOption(questionIndex, optionIndex) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options
                .filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex)
                .map((option, currentOptionIndex) => ({
                  ...option,
                  sortOrder: currentOptionIndex + 1
                }))
            }
          : question
      )
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const questions = form.questions.map((question, questionIndex) => ({
      ...question,
      points: Number(question.points),
      sortOrder: questionIndex + 1,
      options: question.options.map((option, optionIndex) => ({
        ...option,
        sortOrder: optionIndex + 1
      }))
    }));

    if (questions.some((question) => question.options.length < 2)) {
      setError("Setiap soal harus memiliki minimal dua pilihan jawaban.");
      return;
    }

    if (questions.some((question) => !question.options.some((option) => option.isCorrect))) {
      setError("Pilih satu jawaban benar untuk setiap soal.");
      return;
    }

    try {
      const payload = {
        materialId: Number(form.materialId),
        title: form.title,
        instructions: form.instructions,
        durationLimitSeconds: Number(form.durationLimitSeconds),
        status: form.status,
        questions
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
        <div className="content-section-heading">
          <div>
            <h2>Kelola evaluasi</h2>
            <p className="muted-text">Buat soal dan pilihan jawaban tanpa menulis JSON.</p>
          </div>
          <span className="badge">Form builder</span>
        </div>
        <div className="two-column">
          <label>
            Materi
            <select value={form.materialId} onChange={(event) => setForm((current) => ({ ...current, materialId: event.target.value }))} required>
              <option value="">Pilih materi</option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <label>
            Judul
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>
          <label>
            Durasi batas (detik)
            <input type="number" min="60" value={form.durationLimitSeconds} onChange={(event) => setForm((current) => ({ ...current, durationLimitSeconds: event.target.value }))} required />
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
        </div>

        <div className="builder-header">
          <div>
            <h3>Daftar soal</h3>
            <p className="muted-text">Tentukan satu jawaban benar pada setiap soal.</p>
          </div>
          <button className="secondary-button" type="button" onClick={addQuestion}>+ Tambah soal</button>
        </div>

        <div className="question-builder">
          {form.questions.map((question, questionIndex) => (
            <section className="question-editor" key={questionIndex}>
              <div className="question-editor-header">
                <strong>Soal {questionIndex + 1}</strong>
                {form.questions.length > 1 && (
                  <button className="danger-button" type="button" onClick={() => removeQuestion(questionIndex)}>Hapus soal</button>
                )}
              </div>
              <label>
                Pertanyaan
                <textarea
                  value={question.questionText}
                  onChange={(event) => updateQuestion(questionIndex, { questionText: event.target.value })}
                  required
                />
              </label>
              <label>
                Bobot nilai
                <input type="number" min="1" value={question.points} onChange={(event) => updateQuestion(questionIndex, { points: event.target.value })} required />
              </label>
              <div className="options-editor">
                <div className="options-editor-header">
                  <strong>Pilihan jawaban</strong>
                  <span className="muted-text">Pilih radio untuk jawaban benar</span>
                </div>
                {question.options.map((option, optionIndex) => (
                  <div className="option-editor" key={optionIndex}>
                    <input
                      type="radio"
                      name={`correct-${questionIndex}`}
                      checked={option.isCorrect}
                      onChange={() => setCorrectOption(questionIndex, optionIndex)}
                      aria-label={`Tandai pilihan ${optionIndex + 1} sebagai jawaban benar`}
                    />
                    <input
                      value={option.optionText}
                      onChange={(event) => updateOption(questionIndex, optionIndex, { optionText: event.target.value })}
                      placeholder={`Pilihan ${optionIndex + 1}`}
                      required
                    />
                    {question.options.length > 2 && (
                      <button className="icon-button" type="button" onClick={() => removeOption(questionIndex, optionIndex)} aria-label="Hapus pilihan">
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button className="text-button" type="button" onClick={() => addOption(questionIndex)}>+ Tambah pilihan</button>
              </div>
            </section>
          ))}
        </div>

        <div className="action-row">
          <button className="primary-button" type="submit">Simpan evaluasi</button>
          <button className="secondary-button" type="button" onClick={() => setForm(emptyForm)}>Reset</button>
        </div>
      </form>
      <div className="card table-card">
        <h2>Daftar evaluasi</h2>
        <table>
          <thead><tr><th>Judul</th><th>Materi</th><th>Status</th><th>Soal</th></tr></thead>
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
