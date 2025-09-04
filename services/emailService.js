const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  // Send email verification
  async sendVerificationEmail(user) {
    try {
      const verificationToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: `"Ideashpere" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: 'Verify Your Email - Ideashpere',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - Ideashpere</title>
            <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); min-height: 100vh;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  
                  <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.95); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
                    
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: white; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Welcome to Ideashpere!</h1>
                        <p style="color: rgba(255, 255, 255, 0.9); font-size: 18px; margin: 8px 0 0 0; font-weight: 400;">Let's verify your email to get started</p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Hi ${user.firstName}!</h2>
                        
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                          Thanks for joining Ideashpere, the collaborative platform for students to share projects and build together!
                        </p>
                        
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                          To complete your registration and start exploring amazing projects, please verify your email address:
                        </p>
                        
                        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                          <tr>
                            <td>
                              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);">
                                Verify Email
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <div style="background: #f7fafc; border-radius: 12px; padding: 20px; margin: 30px 0;">
                          <p style="color: #2d3748; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">⏰ Important:</p>
                          <p style="color: #4a5568; font-size: 14px; line-height: 1.5; margin: 0;">
                            This verification link expires in 24 hours for security reasons.
                          </p>
                        </div>
                        
                        <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                          If the button doesn't work, copy and paste this link: <br>
                          <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                        </p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #718096; font-size: 14px; margin: 0;">
                          Didn't create an account? You can safely ignore this email.
                        </p>
                        <p style="color: #a0aec0; font-size: 12px; margin: 8px 0 0 0;">
                          © 2025 Ideashpere - Building the future together
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                  
                </td>
              </tr>
            </table>
            
          </body>
          </html>
        `
      };

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
        subject: 'Welcome to Ideashpere! Your journey begins now',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Ideashpere</title>
            <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0f4c75 0%, #3282b8 100%); min-height: 100vh;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  
                  <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.95); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
                    
                    <tr>
                      <td style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: white; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">You're In! 🎉</h1>
                        <p style="color: rgba(255, 255, 255, 0.9); font-size: 18px; margin: 8px 0 0 0; font-weight: 400;">Welcome to the Ideashpere community</p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Hey ${user.firstName}! 👋</h2>
                        
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          Your email has been successfully verified! You're now part of the Ideashpere community where students build, share, and collaborate on amazing projects.
                        </p>
                        
                        <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 12px; padding: 24px; margin: 24px 0;">
                          <h3 style="color: #2d3748; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">🚀 Quick Start Guide:</h3>
                          <ul style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0; padding-left: 20px;">
                            <li><strong>Complete Your Profile:</strong> Add your interests, skills, and bio</li>
                            <li><strong>Explore Projects:</strong> Discover what others are building</li>
                            <li><strong>Share Your Work:</strong> Upload your first project</li>
                            <li><strong>Join a Room:</strong> Collaborate in Build Together Studio</li>
                          </ul>
                        </div>
                        
                        <table cellpadding="0" cellspacing="0" style="margin: 30px auto 0;">
                          <tr>
                            <td>
                              <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(72, 187, 120, 0.3);">
                                Start Exploring
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #718096; font-size: 15px; line-height: 1.5; margin: 30px 0 0 0; text-align: center;">
                          Questions? Reply to this email and we'll help you out!<br>
                          <strong style="color: #2d3748;">Happy building!</strong>
                        </p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #2d3748; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">The Ideashpere Team</p>
                        <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                          © 2025 Ideashpere - Building the future together
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                  
                </td>
              </tr>
            </table>
            
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

  // Send password reset email
  async sendPasswordResetEmail(user, resetUrl) {
    try {
      const mailOptions = {
        from: `"Ideashpere Security" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: 'Reset Your Password - Ideashpere',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - Ideashpere</title>
            <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #742a2a 0%, #c53030 100%); min-height: 100vh;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  
                  <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.95); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
                    
                    <tr>
                      <td style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: white; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">🔑 Password Reset Request</h1>
                        <p style="color: rgba(255, 255, 255, 0.9); font-size: 18px; margin: 8px 0 0 0; font-weight: 400;">Someone requested to reset your password</p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Hi ${user.firstName}!</h2>
                        
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          We received a request to reset the password for your Ideashpere account.
                        </p>
                        
                        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                          <tr>
                            <td>
                              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(229, 62, 62, 0.3);">
                                Reset My Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <div style="background: #fed7d7; border: 1px solid #fc8181; border-radius: 12px; padding: 20px; margin: 30px 0;">
                          <p style="color: #2d3748; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">⚠️ Security Notice:</p>
                          <ul style="color: #4a5568; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 16px;">
                            <li>This link expires in <strong>1 hour</strong></li>
                            <li>If you didn't request this, please ignore this email</li>
                            <li>Your password will remain unchanged</li>
                          </ul>
                        </div>
                        
                        <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 20px 0;">
                          If the button doesn't work, copy and paste this link: <br>
                          <a href="${resetUrl}" style="color: #e53e3e; word-break: break-all;">${resetUrl}</a>
                        </p>
                        
                        <div style="background: #f7fafc; border-radius: 8px; padding: 16px; margin: 24px 0 0 0;">
                          <p style="color: #2d3748; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">Didn't request this?</p>
                          <p style="color: #718096; font-size: 14px; margin: 0;">If you didn't request a password reset, someone else might have entered your email by mistake. You can safely ignore this email - your account is secure.</p>
                        </div>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #718096; font-size: 14px; margin: 0;">
                          🔒 This is an automated security email from Ideashpere
                        </p>
                        <p style="color: #a0aec0; font-size: 12px; margin: 8px 0 0 0;">
                          © 2025 Ideashpere - Building the future together
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                  
                </td>
              </tr>
            </table>
            
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send password reset confirmation email
  async sendPasswordResetConfirmationEmail(user) {
    try {
      const mailOptions = {
        from: `"Ideashpere Security" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: 'Password Changed Successfully - Ideashpere',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed Successfully - Ideashpere</title>
            <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #22543d 0%, #38a169 100%); min-height: 100vh;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  
                  <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.95); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
                    
                    <tr>
                      <td style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: white; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">✅ Password Changed!</h1>
                        <p style="color: rgba(255, 255, 255, 0.9); font-size: 18px; margin: 8px 0 0 0; font-weight: 400;">Your password has been updated successfully</p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Hi ${user.firstName}!</h2>
                        
                        <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
                          <p style="color: #22543d; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">✅ Success!</p>
                          <p style="color: #38a169; font-size: 15px; margin: 0;">
                            Your Ideashpere password was changed successfully at ${new Date().toLocaleString()}.
                          </p>
                        </div>
                        
                        <div style="margin: 24px 0;">
                          <h3 style="color: #2d3748; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">What's next?</h3>
                          <ul style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0; padding-left: 20px;">
                            <li>You can now log in with your new password</li>
                            <li>All your data and projects are safe</li>
                            <li>Continue building amazing projects!</li>
                          </ul>
                        </div>
                        
                        <div style="background: #edf2f7; border-radius: 8px; padding: 16px; margin: 24px 0;">
                          <p style="color: #2d3748; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">🔒 Security tip:</p>
                          <p style="color: #4a5568; font-size: 14px; margin: 0;">Use a strong, unique password and consider enabling two-factor authentication when available.</p>
                        </div>
                        
                        <div style="background: #fef5e7; border: 1px solid #f6d55c; border-radius: 8px; padding: 16px; margin: 24px 0 0 0;">
                          <p style="color: #744210; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">⚠️ Didn't change your password?</p>
                          <p style="color: #975a16; font-size: 14px; margin: 0;">If you didn't change your password, please contact us immediately at support@ideashpere.com</p>
                        </div>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                          © 2025 Ideashpere - Building the future together
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                  
                </td>
              </tr>
            </table>
            
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset confirmation sent to:', user.email);

    } catch (error) {
      console.error('❌ Error sending confirmation email:', error);
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
