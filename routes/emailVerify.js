const express = require('express');
const emailService = require('../services/emailService');
const { User } = require('../models');

const router = express.Router();

// Handle email verification link clicks (GET request)
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Failed - Ideashpere</title>
          <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              color: #2d3748;
            }
            .container {
              background: white;
              border-radius: 24px;
              padding: 48px 40px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
              text-align: center;
              border: 1px solid #e2e8f0;
            }
            .error-icon {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              font-size: 36px;
              color: #e53e3e;
            }
            h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 12px;
              color: #2d3748;
              letter-spacing: -0.5px;
            }
            .message {
              color: #e53e3e;
              font-size: 18px;
              font-weight: 500;
              margin-bottom: 32px;
            }
            .btn {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 50px;
              font-weight: 600;
              font-size: 16px;
              letter-spacing: 0.5px;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
              box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
            }
            @media (max-width: 480px) {
              .container { padding: 32px 24px; }
              h1 { font-size: 24px; }
              .btn { width: 100%; padding: 18px 32px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <h1>Verification Failed</h1>
            <p class="message">Verification token is missing from the link.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Go to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verify token using your email service
    const decoded = await emailService.verifyEmailToken(token);

    // Find user by ID from token
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>User Not Found - Ideashpere</title>
          <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              color: #2d3748;
            }
            .container {
              background: white;
              border-radius: 24px;
              padding: 48px 40px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
              text-align: center;
              border: 1px solid #e2e8f0;
            }
            .error-icon {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              font-size: 36px;
              color: #e53e3e;
            }
            h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 12px;
              color: #2d3748;
              letter-spacing: -0.5px;
            }
            .message {
              color: #e53e3e;
              font-size: 18px;
              font-weight: 500;
              margin-bottom: 32px;
            }
            .btn {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 50px;
              font-weight: 600;
              font-size: 16px;
              letter-spacing: 0.5px;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
              box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
            }
            @media (max-width: 480px) {
              .container { padding: 32px 24px; }
              h1 { font-size: 24px; }
              .btn { width: 100%; padding: 18px 32px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <h1>User Not Found</h1>
            <p class="message">The user associated with this verification link could not be found.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Go to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Already Verified - Ideashpere</title>
          <link href="https://fonts.googleapis.com/css2?family:Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              color: #2d3748;
            }
            .container {
              background: white;
              border-radius: 24px;
              padding: 48px 40px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
              text-align: center;
              border: 1px solid #e2e8f0;
            }
            .success-icon {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              font-size: 36px;
            }
            h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 12px;
              color: #2d3748;
              letter-spacing: -0.5px;
            }
            .subtitle {
              color: #4a5568;
              font-size: 18px;
              font-weight: 500;
              margin-bottom: 32px;
            }
            .btn {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 50px;
              font-weight: 600;
              font-size: 16px;
              letter-spacing: 0.5px;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
              box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
            }
            @media (max-width: 480px) {
              .container { padding: 32px 24px; }
              h1 { font-size: 24px; }
              .btn { width: 100%; padding: 18px 32px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Already Verified</h1>
            <p class="subtitle">Your email is already verified, ${user.firstName}!</p>
            <p style="color: #4a5568; margin-bottom: 32px;">You can now access all features of Ideashpere.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Go to App</a>
          </div>
        </body>
        </html>
      `);
    }

    // Mark email as verified
    await user.update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Success response
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified Successfully - Ideashpere</title>
        <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #2d3748;
          }
          
          .container {
            background: white;
            border-radius: 24px;
            padding: 48px 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
            text-align: center;
            border: 1px solid #e2e8f0;
          }
          
          .success-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 36px;
          }
          
          h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #2d3748;
            letter-spacing: -0.5px;
          }
          
          .subtitle {
            color: #4a5568;
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 8px;
          }
          
          .email {
            color: #667eea;
            font-weight: 600;
            margin-bottom: 32px;
          }
          
          .features {
            background: #f7fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
            text-align: left;
          }
          
          .features h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #2d3748;
          }
          
          .features ul {
            list-style: none;
            padding: 0;
          }
          
          .features li {
            padding: 8px 0;
            color: #4a5568;
            font-size: 15px;
            position: relative;
            padding-left: 24px;
          }
          
          .features li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #48bb78;
            font-weight: 600;
          }
          
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
          }
          
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
          }
          
          @media (max-width: 480px) {
            .container {
              padding: 32px 24px;
            }
            
            h1 {
              font-size: 24px;
            }
            
            .subtitle {
              font-size: 16px;
            }
            
            .btn {
              width: 100%;
              padding: 18px 32px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          
          <h1>Email Verified Successfully!</h1>
          
          <p class="subtitle">Welcome to Ideashpere, ${user.firstName}!</p>
          <p class="email">${user.email}</p>
          
          <div class="features">
            <h3>You can now:</h3>
            <ul>
              <li>Share your projects with the community</li>
              <li>Join Build Together Studio rooms</li>
              <li>Connect with other students</li>
              <li>Explore amazing projects</li>
            </ul>
          </div>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">
            Start Exploring
          </a>
        </div>
      </body>
      </html>
    `);

    console.log(`✅ Email verified successfully for user: ${user.email}`);

  } catch (error) {
    console.error('Email verification error:', error);
    
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Failed - Ideashpere</title>
        <link href="https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Geologica', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #2d3748;
          }
          .container {
            background: white;
            border-radius: 24px;
            padding: 48px 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
            text-align: center;
            border: 1px solid #e2e8f0;
          }
          .error-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 36px;
            color: #e53e3e;
          }
          h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #2d3748;
            letter-spacing: -0.5px;
          }
          .message {
            color: #e53e3e;
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 16px;
          }
          .description {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
          }
          @media (max-width: 480px) {
            .container { padding: 32px 24px; }
            h1 { font-size: 24px; }
            .btn { width: 100%; padding: 18px 32px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">❌</div>
          <h1>Verification Failed</h1>
          <p class="message">The verification link is invalid or has expired.</p>
          <div class="description">
            <p>Please request a new verification email from your account.</p>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Go to Homepage</a>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
