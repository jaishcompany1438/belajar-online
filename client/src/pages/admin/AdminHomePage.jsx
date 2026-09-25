import { Link } from "react-router-dom";

const shortcuts = [
  { to: "/admin/pendaftaran", title: "Pendaftaran", desc: "Atur periode pendaftaran dan histori perubahan." },
  { to: "/admin/peserta", title: "Peserta", desc: "Approve atau reject akun pending serta atur kelas." },
  { to: "/admin/materi", title: "Materi", desc: "CRUD materi, target kelas, dan status publish." },
  { to: "/admin/evaluasi", title: "Evaluasi", desc: "Kelola evaluasi per materi beserta soal pilihan ganda." },
  { to: "/admin/laporan", title: "Laporan", desc: "Pantau progres menyimak dan hasil evaluasi." }
];

export function AdminHomePage() {
  return (
    <div className="grid-cards">
      {shortcuts.map((item) => (
        <Link key={item.to} to={item.to} className="card shortcut-card">
          <h2>{item.title}</h2>
          <p>{item.desc}</p>
        </Link>
      ))}
    </div>
  );
}

