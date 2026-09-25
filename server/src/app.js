import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import evaluationRoutes from "./routes/evaluations.js";
import materialRoutes from "./routes/materials.js";
import meRoutes from "./routes/me.js";
import rankingRoutes from "./routes/rankings.js";
import watchSessionRoutes from "./routes/watch-sessions.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan("dev"));

  app.get("/api/health", (_req, res) => {
    res.json({
      data: {
        ok: true
      }
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/me", meRoutes);
  app.use("/api/materials", materialRoutes);
  app.use("/api", watchSessionRoutes);
  app.use("/api", evaluationRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/rankings", rankingRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);

  return app;
}
