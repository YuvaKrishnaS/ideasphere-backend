const express = require('express');
const { User } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Handle password reset page (GET request from email link)
router.get('/reset-password', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Reset Link - Ideashpere</title>
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
            <h1>Invalid Reset Link</h1>
            <p class="message">The password reset link is missing a valid token.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Go to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }

    // Check if token is valid
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          [Op.gt]: new Date()
        },
        isActive: true
      }
    });

    if (!user) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Link Expired - Ideashpere</title>
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
            <div class="error-icon">⏰</div>
            <h1>Reset Link Expired</h1>
            <p class="message">This password reset link has expired or is invalid.</p>
            <div class="description">
              <p>Password reset links expire after 1 hour for security reasons.</p>
              <p>Please request a new password reset link.</p>
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password" class="btn">Request New Link</a>
          </div>
        </body>
        </html>
      `);
    }

    // Show password reset form
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Ideashpere</title>
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
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
            border: 1px solid #e2e8f0;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          
          .icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 24px;
          }
          
          h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #2d3748;
            letter-spacing: -0.5px;
          }
          
          .subtitle {
            color: #4a5568;
            font-size: 16px;
            font-weight: 500;
          }
          
          .requirements {
            background: #f7fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 32px;
            border-left: 4px solid #667eea;
          }
          
          .requirements h3 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #2d3748;
          }
          
          .requirements ul {
            font-size: 14px;
            color: #4a5568;
            margin-left: 16px;
            line-height: 1.5;
          }
          
          .requirements li {
            margin-bottom: 4px;
          }
          
          .form-group {
            margin-bottom: 24px;
          }
          
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2d3748;
            font-size: 14px;
          }
          
          input[type="password"] {
            width: 100%;
            padding: 16px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 16px;
            font-family: inherit;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            background: #fafafa;
          }
          
          input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
          
          .btn {
            width: 100%;
            background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
            color: white;
            border: none;
            padding: 18px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            font-family: inherit;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 8px 20px rgba(229, 62, 62, 0.3);
          }
          
          .btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 12px 24px rgba(229, 62, 62, 0.4);
          }
          
          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          .message {
            margin-top: 20px;
            padding: 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
          }
          
          .message.success {
            background: #f0fff4;
            color: #22543d;
            border: 1px solid #9ae6b4;
          }
          
          .message.error {
            background: #fed7d7;
            color: #742a2a;
            border: 1px solid #fc8181;
          }
          
          .strength-indicator {
            margin-top: 8px;
            height: 4px;
            background: #e2e8f0;
            border-radius: 2px;
            overflow: hidden;
          }
          
          .strength-bar {
            height: 100%;
            width: 0%;
            transition: width 0.3s ease, background-color 0.3s ease;
          }
          
          .strength-weak { background: #e53e3e; }
          .strength-medium { background: #d69e2e; }
          .strength-strong { background: #38a169; }
          
          @media (max-width: 480px) {
            .container {
              padding: 32px 24px;
            }
            
            h1 {
              font-size: 24px;
            }
            
            .btn {
              padding: 20px 32px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">🔑</div>
            <h1>Reset Password</h1>
            <p class="subtitle">Hi ${user.firstName}! Enter your new password below.</p>
          </div>
          
          <div class="requirements">
            <h3>Password Requirements:</h3>
            <ul>
              <li>At least 8 characters long</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
            </ul>
          </div>

          <form id="resetForm">
            <input type="hidden" id="token" value="${token}">
            
            <div class="form-group">
              <label for="password">New Password</label>
              <input type="password" id="password" required minlength="8" autocomplete="new-password">
              <div class="strength-indicator">
                <div class="strength-bar" id="strengthBar"></div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input type="password" id="confirmPassword" required minlength="8" autocomplete="new-password">
            </div>
            
            <button type="submit" class="btn" id="submitBtn">
              Reset Password
            </button>
          </form>
          
          <div id="message"></div>
        </div>

        <script>
          const passwordInput = document.getElementById('password');
          const confirmPasswordInput = document.getElementById('confirmPassword');
          const strengthBar = document.getElementById('strengthBar');
          const submitBtn = document.getElementById('submitBtn');
          const messageDiv = document.getElementById('message');
          
          // Password strength checker
          passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            updateStrengthBar(strength);
          });
          
          function calculatePasswordStrength(password) {
            let score = 0;
            if (password.length >= 8) score += 25;
            if (/[a-z]/.test(password)) score += 25;
            if (/[A-Z]/.test(password)) score += 25;
            if (/[0-9]/.test(password)) score += 25;
            return score;
          }
          
          function updateStrengthBar(strength) {
            strengthBar.style.width = strength + '%';
            
            if (strength < 50) {
              strengthBar.className = 'strength-bar strength-weak';
            } else if (strength < 100) {
              strengthBar.className = 'strength-bar strength-medium';
            } else {
              strengthBar.className = 'strength-bar strength-strong';
            }
          }
          
          document.getElementById('resetForm').onsubmit = async function(e) {
            e.preventDefault();
            
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const token = document.getElementById('token').value;
            
            if (password !== confirmPassword) {
              showMessage('Passwords do not match!', 'error');
              return;
            }
            
            if (calculatePasswordStrength(password) < 100) {
              showMessage('Please ensure your password meets all requirements.', 'error');
              return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Resetting...';
            
            try {
              const response = await fetch('/api/password-reset/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
              });
              
              const data = await response.json();
              
              if (data.success) {
                showMessage(data.message, 'success');
                setTimeout(() => {
                  window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:3000'}/login';
                }, 2000);
              } else {
                showMessage(data.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
              }
            } catch (error) {
              showMessage('An error occurred. Please try again.', 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = 'Reset Password';
            }
          };
          
          function showMessage(text, type) {
            messageDiv.innerHTML = '<div class="message ' + type + '">' + text + '</div>';
          }
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Password reset page error:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
