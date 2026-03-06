const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM || "onboarding@resend.dev";

async function sendVerificationEmail(to, code) {
    if (!process.env.RESEND_API_KEY) {
        console.log("[DEV] No RESEND_API_KEY set. Verification code for", to, ":", code);
        return;
    }

    const { error } = await resend.emails.send({
        from: FROM,
        to,
        subject: "Verify your skateconnected.ie account",
        html: `
            <p>Your skateconnected.ie verification code is:</p>
            <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
            <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
        `,
        text: `Your verification code is: ${code}. It expires in 15 minutes.`,
    });

    if (error) {
        console.error("Failed to send verification email:", error);
        throw new Error(error.message);
    }
}

module.exports = { sendVerificationEmail };
