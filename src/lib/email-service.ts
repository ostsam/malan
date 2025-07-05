// Email service configuration
// This file can be easily updated to use different email providers

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Example implementation with Resend
export async function sendEmail(data: EmailData) {
  // For development, just log the email
  if (process.env.NODE_ENV === "development") {
    console.log("📧 Email would be sent:", {
      to: data.to,
      subject: data.subject,
      html: data.html,
    });
    return;
  }

  // Production email sending with Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "noreply@yourdomain.com",
          to: data.to,
          subject: data.subject,
          html: data.html,
          text: data.text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Email sending failed:", error);
      throw error;
    }
  }

  // Fallback: SMTP configuration
  if (process.env.SMTP_HOST) {
    // You can implement SMTP here using nodemailer
    console.log("SMTP email sending not implemented yet");
    throw new Error("SMTP email sending not implemented");
  }

  throw new Error("No email service configured");
}

// Email templates
export function createVerificationEmailTemplate(
  userEmail: string,
  verificationUrl: string
) {
  return {
    to: userEmail,
    subject: "Verify your email address - Malan",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email - Malan</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Malan! 🎉</h1>
            </div>
            
            <p>Hi there,</p>
            
            <p>Thanks for signing up for Malan! To complete your registration and start learning languages with your AI conversation partner, please verify your email address.</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            
            <p>This link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with Malan, you can safely ignore this email.</p>
            
            <div class="footer">
              <p>Best regards,<br>The Malan Team</p>
              <p>This is an automated email, please don't reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Malan!

Thanks for signing up for Malan! To complete your registration and start learning languages with your AI conversation partner, please verify your email address.

Click this link to verify your email: ${verificationUrl}

This link will expire in 24 hours for security reasons.

If you didn't create an account with Malan, you can safely ignore this email.

Best regards,
The Malan Team
    `,
  };
}
