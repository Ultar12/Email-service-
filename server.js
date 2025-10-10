require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// --- Environment Variables ---
const PORT = process.env.PORT || 4000;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const SECRET_API_KEY = process.env.SECRET_API_KEY; // For security

// --- Nodemailer Setup ---
if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('CRITICAL: GMAIL_USER or GMAIL_APP_PASSWORD is not set. Email service cannot start.');
  process.exit(1);
}
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

// --- Security Middleware ---
const apiKeyAuth = (req, res, next) => {
  const providedKey = req.header('X-API-Key');
  if (!providedKey || providedKey !== SECRET_API_KEY) {
    console.warn('Unauthorized attempt to use email service.');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// --- API Endpoint ---
app.post('/send-email', apiKeyAuth, async (req, res) => {
  const { type, payload } = req.body;

  if (!type || !payload || !payload.toEmail) {
    return res.status(400).json({ success: false, message: 'Missing type, payload, or recipient email.' });
  }

  try {
    let mailOptions;
    let subject = '';

    // Determine which email to send based on the 'type'
    switch (type) {
      case 'verification':
        subject = 'Your Verification Code';
        mailOptions = {
            from: `"ULTAR'S WBD" <${GMAIL_USER}>`,
            to: payload.toEmail,
            subject: subject,
            html: `
              <div style="background-color: #000; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff; text-align: center; border-radius: 10px;">
                <p style="font-size: 16px;">Please use the code below to complete your registration. This code is valid for 10 minutes.</p>
                <div style="background-color: #121212; border-radius: 8px; padding: 15px; margin: 20px auto; max-width: 200px;">
                    <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #69F0AE; margin: 0;">
                        ${payload.verificationCode}
                    </p>
                </div>
                <p style="font-size: 12px; color: #aaa; margin-top: 20px;">If you did not request this code, you can safely ignore this email.</p>
              </div>
            `
        };
        break;

      case 'logout_reminder':
        subject = `Action Required: Your Bot (${payload.appName}) is Offline`;
        mailOptions = {
            from: `"ULTAR'S WBD" <${GMAIL_USER}>`,
            to: payload.toEmail,
            subject: subject,
            html: `
              <div style="background-color: #000; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff; text-align: center; border-radius: 10px;">
                <h1 style="font-size: 24px; font-weight: bold; color: #ff3b30;">Your Bot (${payload.appName}) is Offline</h1>
                <div style="background-color: #4d2f00; border: 1px solid #ff9500; border-radius: 8px; padding: 15px; margin: 20px auto; max-width: 90%;">
                  <h2 style="font-size: 18px; color: #ff9500; margin-top: 0;">Deletion Warning</h2>
                  <p style="font-size: 16px; margin: 0;">To prevent wasting resources, this bot will be automatically and permanently deleted in <strong>${payload.daysUntilDeletion} days</strong> if it remains offline.</p>
                </div>
                <p style="font-size: 17px;">Please update your session ID to bring it back online.</p>
                <a href="https://t.me/${payload.botUsername}" style="display: inline-block; padding: 12px 24px; margin-top: 10px; background-color: #007aff; color: #fff; text-decoration: none; border-radius: 50px; font-weight: bold;">UPDATE SESSION ID</a>
                <p style="font-size: 14px; margin-top: 20px;">Sincerely,<br><strong>ULTAR'S WBD</strong></p>
              </div>
            `
        };
        break;

      case 'payment_confirmation':
        subject = `Payment Confirmed: Your Bot Deployment`;
        mailOptions = {
            from: `"ULTAR'S WBD" <${GMAIL_USER}>`,
            to: payload.toEmail,
            subject: subject,
            html: `
              <div style="background-color: #000; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff; text-align: center; border-radius: 10px;">
                <h1 style="font-size: 24px; font-weight: bold; margin-top: 20px;">Payment Received!</h1>
                <p>Thank you, ${payload.userName || 'User'}. We've received your payment and your bot deployment has started.</p>
                <div style="background-color: #121212; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left;">
                  <h2 style="font-size: 18px; color: #fff; margin-top: 0; text-align: center;">Transaction Details</h2>
                  <p style="color: #ccc; font-size: 14px;"><strong>Reference:</strong> ${payload.referenceId}</p>
                  
                </div>
                <a href="https://t.me/ultarbotdeploybot" style="display: inline-block; padding: 12px 24px; margin-top: 20px; background-color: #69F0AE; color: #121212; text-decoration: none; border-radius: 50px; font-weight: bold;">GO TO YOUR BOT</a>
                <p style="font-size: 14px; margin-top: 20px;">Sincerely,<br><strong>ULTAR'S WBD</strong></p>
              </div>
            `
        };
        break;
      
      default:
        return res.status(400).json({ success: false, message: 'Invalid email type specified.' });
    }

    await transporter.sendMail(mailOptions);
    console.log(`Successfully sent '${type}' email to ${payload.toEmail}`);
    res.status(200).json({ success: true, message: `Email sent successfully.` });

  } catch (error) {
    console.error(`Failed to send '${type}' email to ${payload.toEmail}:`, error);
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Ultar Email Service is running!');
});

app.listen(PORT, () => {
  console.log(`Email service listening on port ${PORT}`);
});
