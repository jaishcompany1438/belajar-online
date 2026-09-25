import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { LoginPage } from "./pages/LoginPage";
import { MaterialDetailPage } from "./pages/MaterialDetailPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RankingsPage } from "./pages/RankingsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResultPage } from "./pages/ResultPage";
import { AdminClassesPage } from "./pages/admin/AdminClassesPage";
import { AdminCohortsPage } from "./pages/admin/AdminCohortsPage";
import { AdminEvaluationsPage } from "./pages/admin/AdminEvaluationsPage";
import { AdminHomePage } from "./pages/admin/AdminHomePage";
import { AdminMaterialsPage } from "./pages/admin/AdminMaterialsPage";
import { AdminRegistrationPage } from "./pages/admin/AdminRegistrationPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["student"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/materi"
          element={
            <ProtectedRoute roles={["student"]}>
              <MaterialsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/materi/:id"
          element={
            <ProtectedRoute roles={["student"]}>
              <MaterialDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluasi/:id"
          element={
            <ProtectedRoute roles={["student"]}>
              <EvaluationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hasil/:attemptId"
          element={
            <ProtectedRoute roles={["student", "admin"]}>
              <ResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/peringkat"
          element={
            <ProtectedRoute roles={["student", "admin"]}>
              <RankingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil"
          element={
            <ProtectedRoute roles={["student", "admin"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminHomePage />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/pendaftaran" element={<ProtectedRoute roles={["admin"]}><AdminRegistrationPage /></ProtectedRoute>} />
        <Route path="/admin/peserta" element={<ProtectedRoute roles={["admin"]}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/tahun-masuk" element={<ProtectedRoute roles={["admin"]}><AdminCohortsPage /></ProtectedRoute>} />
        <Route path="/admin/kelas" element={<ProtectedRoute roles={["admin"]}><AdminClassesPage /></ProtectedRoute>} />
        <Route path="/admin/materi" element={<ProtectedRoute roles={["admin"]}><AdminMaterialsPage /></ProtectedRoute>} />
        <Route path="/admin/evaluasi" element={<ProtectedRoute roles={["admin"]}><AdminEvaluationsPage /></ProtectedRoute>} />
        <Route path="/admin/laporan" element={<ProtectedRoute roles={["admin"]}><AdminReportsPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

