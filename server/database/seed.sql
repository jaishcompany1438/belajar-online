USE beol;

INSERT INTO users (id, username, email, password_hash, role, full_name, bio, phone, status, created_at, updated_at)
VALUES
  (1, 'admin', 'admin@example.com', '$2a$10$D6NWBnBCuj53pPEU/RPUT.WWLBZoHdx.zSMvX4yN8Y1aDarBFXthi', 'admin', 'Administrator', 'Administrator LMS', '081234567890', 'active', UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE email = VALUES(email), password_hash = VALUES(password_hash), role = VALUES(role), status = VALUES(status);

INSERT INTO cohorts (id, name, admission_year, status, created_at, updated_at)
VALUES
  (1, 'Angkatan 2024', 2024, 'active', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (2, 'Angkatan 2025', 2025, 'active', UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE name = VALUES(name), admission_year = VALUES(admission_year), status = VALUES(status);

INSERT INTO classes (id, name, cohort_id, description, status, created_at, updated_at)
VALUES
  (1, 'Tahsin A', 1, 'Kelas pemula tahsin', 'active', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  (2, 'Tahfidz B', 2, 'Kelas lanjutan tahfidz', 'active', UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE name = VALUES(name), cohort_id = VALUES(cohort_id), status = VALUES(status);

INSERT INTO registration_settings (id, registration_open_at, registration_close_at, status, updated_by, created_at, updated_at)
VALUES
  (1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY), 'configured', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE registration_open_at = VALUES(registration_open_at), registration_close_at = VALUES(registration_close_at), updated_by = VALUES(updated_by);
