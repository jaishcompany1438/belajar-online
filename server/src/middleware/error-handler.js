import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: "Validasi gagal",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      }
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: {
        message: error.message,
        details: error.details
      }
    });
  }

  if (
    ["ECONNREFUSED", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST", "ECONNRESET"].includes(
      error.code
    )
  ) {
    console.error("Database connection error:", error);
    return res.status(503).json({
      error: {
        message: "Database tidak tersedia. Pastikan MySQL XAMPP sedang berjalan."
      }
    });
  }

  console.error(error);
  return res.status(500).json({
    error: {
      message: "Terjadi kesalahan pada server"
    }
  });
}
