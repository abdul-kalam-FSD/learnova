// No email-sending dependency (nodemailer, SendGrid, Resend, SES,
// etc.) is installed in this project yet — see package.json. Rather
// than fake it (an "Email sent!" success message that quietly does
// nothing is worse than no feature at all — a user thinks help is on
// the way and it never arrives), this module implements the correct
// *shape* of the integration point and is explicit about what's
// still missing for production.
//
// authControllers.forgotPassword calls sendPasswordResetEmail() with
// a real, valid, single-use reset link. Wiring a real provider in is
// a two-step job:
//   1. `npm install` a provider SDK (or use SMTP via nodemailer).
//   2. Replace the body of sendPasswordResetEmail below with that
//      provider's send call, using RESET_EMAIL_FROM /
//      <PROVIDER>_API_KEY env vars (add them to .env.example too).
// Until then, this logs the link server-side so the flow is testable
// end-to-end in dev — but nothing is emailed to the user, which is
// why forgotPassword's HTTP response and the reports produced from
// this work both flag this as a deployment blocker rather than a
// finished feature.

const isProduction = process.env.NODE_ENV === "production";

async function sendPasswordResetEmail(email, resetUrl) {
  if (isProduction) {
    // Deliberately loud: a silent no-op in production would look
    // exactly like a successful, invisible failure. Surfacing this on
    // every real request until a provider is wired in is the point.
    // eslint-disable-next-line no-console
    console.error(
      "[mailer] No email provider configured — password reset email to " +
        `${email} was NOT sent. See backend/src/utils/mailer.js.`,
    );
    return { sent: false, reason: "no_provider_configured" };
  }

  // Dev/test: log the link so the flow can be exercised manually or
  // from an integration test without a real inbox.
  // eslint-disable-next-line no-console
  console.log(`[mailer:dev] Password reset link for ${email}: ${resetUrl}`);
  return { sent: false, reason: "dev_mode_logged_only" };
}

module.exports = { sendPasswordResetEmail };
