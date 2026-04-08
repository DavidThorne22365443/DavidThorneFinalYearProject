const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM || "onboarding@resend.dev";

async function sendPasswordResetEmail(to, resetLink) {
    if (!process.env.RESEND_API_KEY) {
        console.log("[DEV] No RESEND_API_KEY set. Password reset link for", to, ":", resetLink);
        return;
    }

    const { error } = await resend.emails.send({
        from: FROM,
        to,
        subject: "Reset your skateconnected.ie password",
        html: `
            <p>We received a request to reset your skateconnected.ie password.</p>
            <p>Click the link below to set a new password. This link expires in 1 hour.</p>
            <p><a href="${resetLink}" style="color:#3b82f6;">Reset my password</a></p>
            <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
        `,
        text: `Reset your skateconnected.ie password by visiting this link (expires in 1 hour):\n\n${resetLink}\n\nIf you didn't request this, ignore this email.`,
    });

    if (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error(error.message);
    }
}

module.exports = { sendPasswordResetEmail };