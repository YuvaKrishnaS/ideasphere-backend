const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

class EmailService {
  constructor() {
    // ✅ FIXED: Use createTransport (not createTransporter)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD // Use App Password, not regular password
      }
    });
  }

  // Send email verification
  async sendVerificationEmail(user) {
    try {
      // Generate verification token (expires in 24 hours)
      const verificationToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create verification URL
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      // Email content
      const mailOptions = {
        from: `"Ideashpere" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: '📧 Verify Your Email - Ideashpere',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Ideashpere! 🚀</h1>
                <p>Let's verify your email to get started</p>
              </div>
              <div class="content">
                <h2>Hi ${user.firstName}!</h2>
                <p>Thanks for joining Ideashpere, the collaborative platform for students to share projects and build together!</p>
                <p>To complete your registration and start exploring amazing projects, please verify your email address:</p>
                
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">✅ Verify My Email</a>
                </div>
                
                <p><strong>This link expires in 24 hours.</strong></p>
                
                <p>If the button doesn't work, copy and paste this link in your browser:</p>
                <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                  ${verificationUrl}
                </p>
                
                <hr style="margin: 30px 0;">
                <p><strong>What's Next?</strong></p>
                <ul>
                  <li>🎯 Set your interests and skills</li>
                  <li>📝 Share your first project</li>
                  <li>🤝 Join Build Together Studio rooms</li>
                  <li>💡 Discover amazing student projects</li>
                </ul>
              </div>
              <div class="footer">
                <p>Didn't create an account? You can ignore this email.</p>
                <p>© 2025 Ideashpere - Building the future together</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  // Send welcome email after verification
  async sendWelcomeEmail(user) {
    try {
      const mailOptions = {
        from: `"Ideashpere Team" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: '🎉 Welcome to Ideashpere! Your journey begins now',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 You're In!</h1>
                <p>Welcome to the Ideashpere community</p>
              </div>
              <div class="content">
                <h2>Hey ${user.firstName}! 👋</h2>
                <p>Your email has been successfully verified! You're now part of the Ideashpere community where students build, share, and collaborate on amazing projects.</p>
                
                <h3>🚀 Quick Start Guide:</h3>
                <ul>
                  <li><strong>Complete Your Profile:</strong> Add your interests, skills, and bio</li>
                  <li><strong>Explore Projects:</strong> Discover what others are building</li>
                  <li><strong>Share Your Work:</strong> Upload your first project</li>
                  <li><strong>Join a Room:</strong> Collaborate in Build Together Studio</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/dashboard" class="cta-button">🚀 Start Exploring</a>
                </div>
                
                <p>Questions? Reply to this email and we'll help you out!</p>
                <p>Happy building! 💪</p>
                <p><strong>The Ideashpere Team</strong></p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent to:', user.email);

    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
    }
  }

  // Verify email token
  async verifyEmailToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired verification token');
    }
  }
}

module.exports = new EmailService();
