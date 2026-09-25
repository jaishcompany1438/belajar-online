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
  mysql: {
    host: readRequired("MYSQL_HOST", "127.0.0.1"),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: readRequired("MYSQL_USER", "root"),
    password: readRequired("MYSQL_PASSWORD", ""),
    database: readRequired("MYSQL_DATABASE", "belajar_online")
  }
};

