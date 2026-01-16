import { Resend } from "resend";
import { getEmailTemplate } from "./emailtemplate";
import { env } from "../env";

const resend = new Resend(env.RESEND_API_KEY);

type EmailType = "VERIFY" | "RESET";

export const sendEmail = async (type: EmailType, email: string, username: string, code: string) => {
  try {
    const subject = type === "VERIFY" ? "Verify your email" : "Reset your password";

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject,
      html: getEmailTemplate(type, username, code),
    });

    return { success: true };
  } catch (error) {
    console.error("Email send failed:", error);
    return { success: false };
  }
};

// const html =
//   type === "VERIFY"
//     ? `
//       <h2>Hello ${username}</h2>
//       <p>Your email verification code:</p>
//       <h1>${code}</h1>
//       <p>This code is valid for 15 minutes.</p>
//     `
//     : `
//       <h2>Hello ${username}</h2>
//       <p>Your password reset code:</p>
//       <h1>${code}</h1>
//       <p>This code is valid for 15 minutes.</p>
//     `;
