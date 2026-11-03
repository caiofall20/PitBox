import nodemailer from 'nodemailer';
// Envio por SMTP (Gmail com senha de app, Brevo, Resend, etc.). Sem SMTP_HOST, o e-mail vai para o log (desenvolvimento).
const transport = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
}) : null;
export const appUrl = () => (process.env.APP_URL || (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0]).replace(/\/$/, '');
export async function sendMail({ to, subject, text, html }) {
  if (!transport) { console.log(`\n[e-mail não enviado: configure SMTP_HOST]\nPara: ${to}\nAssunto: ${subject}\n${text}\n`); return; }
  await transport.sendMail({ from: process.env.MAIL_FROM || 'PitBox <no-reply@pitbox.app>', to, subject, text, html });
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function resetEmail(name, link) {
  const first = String(name || '').split(' ')[0] || 'colecionador';
  return {
    subject: 'Crie uma nova senha no PitBox',
    text: `Olá, ${first}!\n\nRecebemos um pedido para trocar a senha da sua conta no PitBox. Abra o link abaixo para criar uma nova senha. Ele vale por 1 hora e só pode ser usado uma vez:\n\n${link}\n\nSe não foi você, ignore este e-mail. Sua senha continua a mesma.`,
    html: `<div style="margin:0;padding:32px 16px;background:#0A0A0C;font-family:Arial,sans-serif;color:#F4F3F1">
  <div style="max-width:480px;margin:0 auto;padding:28px;border-radius:20px;background:#141418;border:1px solid #26262C">
    <div style="font-size:20px;letter-spacing:3px;font-weight:bold;margin-bottom:20px"><span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:50%;background:#D7261E;color:#FFC93C;margin-right:8px">P</span>PITBOX</div>
    <h1 style="margin:0 0 8px;font-size:22px">Olá, ${esc(first)}!</h1>
    <p style="margin:0 0 20px;color:#B9B7BD;line-height:1.5">Recebemos um pedido para trocar a senha da sua conta. O link vale por 1 hora e só pode ser usado uma vez.</p>
    <a href="${esc(link)}" style="display:block;padding:16px;border-radius:14px;background:#D7261E;color:#ffffff;text-align:center;font-weight:bold;text-decoration:none">Criar nova senha</a>
    <p style="margin:20px 0 0;color:#8F8D94;font-size:13px;line-height:1.5">Se não foi você, ignore este e-mail. Sua senha continua a mesma.</p>
  </div>
</div>`,
  };
}
