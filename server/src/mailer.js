// Sends emails (currently just verification codes).
// With SMTP_HOST set in .env, mail goes through that server.
// Without it (local development), mail goes to a free Ethereal test inbox: nothing is really delivered,
// and the server log prints a link to view the email plus the code itself, so you can test without a real mailbox.
const nodemailer = require('nodemailer');

let transporterPromise = null;
const usingRealSmtp = () => Boolean(process.env.SMTP_HOST);

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = usingRealSmtp()
      ? Promise.resolve(
          nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: Number(process.env.SMTP_PORT) === 465, // true only for port 465
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          })
        )
      : nodemailer.createTestAccount().then((account) =>
          nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass },
          })
        );
    // If setup fails, try again on the next email instead of failing forever.
    transporterPromise.catch(() => { transporterPromise = null; });
  }
  return transporterPromise;
}

async function sendVerificationEmail(to, code) {
  const message = {
    from: process.env.MAIL_FROM || 'Wardrobe Helper <no-reply@wardrobe-helper.local>',
    to,
    subject: 'Your Wardrobe Helper verification code',
    text: `Your verification code is ${code}. It expires in 15 minutes.\n\nIf you didn't create a Wardrobe Helper account, you can ignore this email.`,
  };

  // Real SMTP: let errors reach the caller so the user sees that sending failed.
  if (usingRealSmtp()) {
    const transporter = await getTransporter();
    await transporter.sendMail(message);
    return;
  }

  // Development: the code is printed here, so testing works even if Ethereal can't be reached.
  console.log(`[dev] Verification code for ${to}: ${code}`);
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail(message);
    console.log(`[dev] View the email at: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (e) {
    console.warn(`[dev] Couldn't reach the Ethereal test inbox (${e.message}). Use the code printed above.`);
  }
}

module.exports = { sendVerificationEmail };
