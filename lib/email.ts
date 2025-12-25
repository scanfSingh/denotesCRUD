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

// Send notification when topics are shared
export async function sendTopicSharedEmail(
  recipientEmail: string,
  recipientName: string,
  sharerName: string,
  topicTitles: string[]
): Promise<boolean> {
  const subject = `${sharerName} shared topics with you - Denotes`;
  const topicList = topicTitles.map((t) => `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">${t}</li>`).join("");
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">📚 Topics Shared With You</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${recipientName},</p>
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>${sharerName}</strong> has shared ${topicTitles.length} topic${topicTitles.length > 1 ? "s" : ""} with you:
        </p>
        <ul style="background: white; border-radius: 8px; padding: 15px 25px; list-style: none; margin: 20px 0;">
          ${topicList}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/shared-topics" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;">
            View Shared Topics
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated notification from Denotes.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: recipientEmail, subject, html });
}

// Send notification when friend request is received
export async function sendFriendRequestEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string
): Promise<boolean> {
  const subject = `${senderName} sent you a friend request - Denotes`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">👋 New Friend Request</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${recipientName},</p>
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>${senderName}</strong> wants to connect with you on Denotes!
        </p>
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          Once you accept, you'll be able to share topics and assign tasks to each other.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/friends" 
             style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;">
            View Friend Request
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated notification from Denotes.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: recipientEmail, subject, html });
}

// Send notification when task is assigned
export async function sendTaskAssignedEmail(
  recipientEmail: string,
  recipientName: string,
  assignerName: string,
  taskTitle: string,
  taskDescription?: string
): Promise<boolean> {
  const subject = `${assignerName} assigned you a task - Denotes`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">✅ New Task Assigned</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${recipientName},</p>
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>${assignerName}</strong> has assigned you a new task:
        </p>
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${taskTitle}</h3>
          ${taskDescription ? `<p style="margin: 0; color: #666; font-size: 14px;">${taskDescription}</p>` : ""}
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/crud" 
             style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;">
            View Tasks
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated notification from Denotes.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: recipientEmail, subject, html });
}

// Send email verification link
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
  
  const subject = "Verify your email - Denotes";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">📧 Verify Your Email</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name || "there"},</p>
        <p style="font-size: 16px; margin-bottom: 20px;">
          Welcome to <strong>Denotes</strong>! Please verify your email address to complete your registration.
        </p>
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          Click the button below to verify your email:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            Verify Email Address
          </a>
        </div>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #999; word-break: break-all; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #e0e0e0;">
          ${verificationUrl}
        </p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          <strong>This link will expire in 24 hours.</strong>
        </p>
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you didn't create an account on Denotes, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to: email, subject, html });
}

