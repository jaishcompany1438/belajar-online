CREATE DATABASE IF NOT EXISTS beol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE beol;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  full_name VARCHAR(120) NOT NULL,
  bio TEXT NULL,
  phone VARCHAR(30) NULL,
  status ENUM('pending', 'active', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS registration_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registration_open_at DATETIME NULL,
  registration_close_at DATETIME NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'configured',
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_registration_settings_user
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS registration_setting_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registration_setting_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_open_at DATETIME NULL,
  old_close_at DATETIME NULL,
  new_open_at DATETIME NULL,
  new_close_at DATETIME NULL,
  changed_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_registration_log_setting
    FOREIGN KEY (registration_setting_id) REFERENCES registration_settings(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_registration_log_user
    FOREIGN KEY (changed_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cohorts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  admission_year INT NOT NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  cohort_id BIGINT UNSIGNED NOT NULL,
  description TEXT NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_classes_cohort (cohort_id),
  CONSTRAINT fk_classes_cohort
    FOREIGN KEY (cohort_id) REFERENCES cohorts(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS user_classes (
  user_id BIGINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  joined_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, class_id),
  KEY idx_user_classes_class (class_id),
  CONSTRAINT fk_user_classes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_classes_class
    FOREIGN KEY (class_id) REFERENCES classes(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS materials (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  youtube_url VARCHAR(255) NOT NULL,
  youtube_video_id VARCHAR(20) NOT NULL,
  thumbnail_url VARCHAR(255) NULL,
  publish_at DATETIME NOT NULL,
  min_watch_seconds INT NOT NULL DEFAULT 180,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_materials_publish (publish_at, status),
  CONSTRAINT fk_materials_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS material_targets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  material_id BIGINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NULL,
  cohort_id BIGINT UNSIGNED NULL,
  KEY idx_material_targets_material (material_id),
  KEY idx_material_targets_class (class_id),
  KEY idx_material_targets_cohort (cohort_id),
  CONSTRAINT fk_material_targets_material
    FOREIGN KEY (material_id) REFERENCES materials(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_material_targets_class
    FOREIGN KEY (class_id) REFERENCES classes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_material_targets_cohort
    FOREIGN KEY (cohort_id) REFERENCES cohorts(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watch_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  material_id BIGINT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  last_heartbeat_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  accumulated_seconds INT NOT NULL DEFAULT 0,
  status ENUM('active', 'finished', 'interrupted') NOT NULL DEFAULT 'active',
  KEY idx_watch_sessions_user_material (user_id, material_id),
  CONSTRAINT fk_watch_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_watch_sessions_material
    FOREIGN KEY (material_id) REFERENCES materials(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS material_progress (
  user_id BIGINT UNSIGNED NOT NULL,
  material_id BIGINT UNSIGNED NOT NULL,
  watched_seconds INT NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, material_id),
  KEY idx_material_progress_material (material_id),
  CONSTRAINT fk_material_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_material_progress_material
    FOREIGN KEY (material_id) REFERENCES materials(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  material_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  instructions TEXT NULL,
  duration_limit_seconds INT NOT NULL DEFAULT 900,
  status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_evaluations_material (material_id),
  CONSTRAINT fk_evaluations_material
    FOREIGN KEY (material_id) REFERENCES materials(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  evaluation_id BIGINT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_questions_evaluation (evaluation_id),
  CONSTRAINT fk_questions_evaluation
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS question_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT UNSIGNED NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 1,
  KEY idx_question_options_question (question_id),
  CONSTRAINT fk_question_options_question
    FOREIGN KEY (question_id) REFERENCES questions(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluation_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  evaluation_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  duration_seconds INT NULL,
  score INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  status ENUM('in_progress', 'submitted') NOT NULL DEFAULT 'in_progress',
  UNIQUE KEY uniq_attempt_once (evaluation_id, user_id),
  KEY idx_attempts_user (user_id),
  KEY idx_attempts_ranking (evaluation_id, score, duration_seconds, submitted_at),
  CONSTRAINT fk_attempts_evaluation
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attempts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  selected_option_id BIGINT UNSIGNED NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  earned_points INT NOT NULL DEFAULT 0,
  question_text_snapshot TEXT NOT NULL,
  option_text_snapshot TEXT NULL,
  KEY idx_attempt_answers_attempt (attempt_id),
  CONSTRAINT fk_attempt_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES evaluation_attempts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attempt_answers_question
    FOREIGN KEY (question_id) REFERENCES questions(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_attempt_answers_option
    FOREIGN KEY (selected_option_id) REFERENCES question_options(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL,
  KEY idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

