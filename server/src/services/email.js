import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function getTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.password || !env.smtp.from) {
    throw new Error("SMTP belum dikonfigurasi untuk pengiriman email verifikasi");
  }

  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password
    }
  });
}

export async function sendVerificationEmail({ email, fullName, code, token }) {
  const verificationUrl = `${env.appUrl}/verify?token=${encodeURIComponent(token)}`;
  await getTransporter().sendMail({
    from: env.smtp.from,
    to: email,
    subject: "Verifikasi pendaftaran Thobari Academy",
    text: [
      `Assalamu'alaikum ${fullName},`,
      "",
      "Pendaftaran Anda berhasil dibuat.",
      `Nomor verifikasi Anda: ${code}`,
      `Buka link berikut lalu masukkan nomor tersebut: ${verificationUrl}`,
      "",
      "Kode berlaku selama 24 jam."
    ].join("\n"),
    html: `
      <p>Assalamu'alaikum ${fullName},</p>
      <p>Pendaftaran Anda di Thobari Academy berhasil dibuat.</p>
      <p>Nomor verifikasi Anda:</p>
      <h2 style="letter-spacing: .2em;">${code}</h2>
      <p><a href="${verificationUrl}">Buka halaman verifikasi</a>, lalu masukkan nomor tersebut.</p>
      <p>Kode berlaku selama 24 jam.</p>
    `
  });
}
