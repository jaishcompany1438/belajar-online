import mysql from "mysql2/promise";
import { env } from "../config/env.js";

export const pool = mysql.createPool({
  ...env.mysql,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: "Z"
});

