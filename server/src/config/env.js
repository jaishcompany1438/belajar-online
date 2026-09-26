import dotenv from "dotenv";

dotenv.config();

function readRequired(name, fallback = "") {
  return process.env[name] || fallback;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: readRequired("JWT_SECRET", "dev-secret"),
  jwtExpiresIn: readRequired("JWT_EXPIRES_IN", "7d"),
  corsOrigin: readRequired("CORS_ORIGIN", "http://localhost:5173"),
  appUrl: readRequired("APP_URL", "http://localhost:5173"),
  smtp: {
    host: readRequired("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: readRequired("SMTP_USER"),
    password: readRequired("SMTP_PASSWORD"),
    from: readRequired("SMTP_FROM")
  },
  mysql: {
    host: readRequired("MYSQL_HOST", "127.0.0.1"),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: readRequired("MYSQL_USER", "root"),
    password: readRequired("MYSQL_PASSWORD", ""),
    database: readRequired("MYSQL_DATABASE", "belajar_online"),
    connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || 5000)
  }
};
