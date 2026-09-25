import { verifyToken } from "../utils/jwt.js";
import { HttpError } from "../utils/http-error.js";

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return next(new HttpError(401, "Autentikasi diperlukan"));
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (_error) {
    return next(new HttpError(401, "Token tidak valid"));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Autentikasi diperlukan"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "Anda tidak memiliki akses"));
    }

    return next();
  };
}

