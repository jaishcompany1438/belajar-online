import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

function MenuLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className={`app-shell ${isAdmin ? "admin-shell" : "student-shell"}`}>
      {isAdmin ? (
        <aside className="sidebar">
          <Link to="/admin" className="brand">
            <img className="brand-logo" src="/logo_bel_on.svg" alt="" />
            <span>Thobari Academy</span>
          </Link>
          <div className="sidebar-label">Menu utama</div>
          <div className="sidebar-group">
            <MenuLink to="/admin">Ringkasan</MenuLink>
            <MenuLink to="/admin/pendaftaran">Pendaftaran</MenuLink>
            <MenuLink to="/admin/peserta">Peserta</MenuLink>
            <MenuLink to="/admin/tahun-masuk">Angkatan</MenuLink>
            <MenuLink to="/admin/kelas">Kelas</MenuLink>
            <MenuLink to="/admin/materi">Materi</MenuLink>
            <MenuLink to="/admin/evaluasi">Evaluasi</MenuLink>
            <MenuLink to="/admin/laporan">Laporan</MenuLink>
            <MenuLink to="/profil">Profil Admin</MenuLink>
          </div>
          <button className="secondary-button sidebar-logout" type="button" onClick={logout}>
            Keluar
          </button>
        </aside>
      ) : (
        <header className="topbar">
          <Link to="/dashboard" className="brand">
            <img className="brand-logo" src="/logo_bel_on.svg" alt="" />
            <span>Thobari Academy</span>
          </Link>
          <nav className="topnav" aria-label="Navigasi utama">
            <MenuLink to="/dashboard">Dashboard</MenuLink>
            <MenuLink to="/materi">Materi</MenuLink>
            <MenuLink to="/peringkat">Peringkat</MenuLink>
            <MenuLink to="/profil">Profil</MenuLink>
          </nav>
          <div className="account-menu">
            <span className="account-name">{user?.fullName}</span>
            <button className="text-button" type="button" onClick={logout}>Keluar</button>
          </div>
        </header>
      )}
      <main className="content">
        <header className="content-header">
          <div>
            <p className="eyebrow">{isAdmin ? "RUANG KERJA ADMIN" : "RUANG BELAJAR"}</p>
            <h1>{isAdmin ? "Admin Panel" : `Selamat datang, ${user?.fullName}`}</h1>
            <p className="muted-text">{isAdmin ? "Kelola pembelajaran dan peserta dengan mudah." : "Lanjutkan perjalanan belajar Anda hari ini."}</p>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
