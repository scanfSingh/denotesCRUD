import nodemailer from "nodemailer";

// Create reusable transporter object using Gmail SMTP
function createTransporter() {
  const email = process.env.EMAIL_FROM || "scanfvaibhav@gmail.com";
  const password = process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD;

  if (!password) {
    throw new Error(
      "EMAIL_PASSWORD or EMAIL_APP_PASSWORD environment variable is not set"
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: password, // Use Gmail App Password here
    },
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    const emailFrom = process.env.EMAIL_FROM || "scanfvaibhav@gmail.com";

    const mailOptions = {
      from: `"Denotes App" <${emailFrom}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ""), // Plain text fallback
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  resetToken: string
): Promise<boolean> {
  const subject = "Password Reset Request - Denotes App";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Password Reset Request</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
        <p style="font-size: 16px; margin-bottom: 20px;">
          We received a request to reset your password for your Denotes account. 
          Click the button below to reset your password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #999; word-break: break-all; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #e0e0e0;">
          ${resetUrl}
        </p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          <strong>This link will expire in 1 hour.</strong>
        </p>
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject,
    html,
  });
}

