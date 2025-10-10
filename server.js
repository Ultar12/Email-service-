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

// --- Nodemailer Setup (from your file) ---
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
// This function checks for your secret key on every request.
const apiKeyAuth = (req, res, next) => {
  const providedKey = req.header('X-API-Key');
  if (!providedKey || providedKey !== SECRET_API_KEY) {
    console.warn('Unauthorized attempt to use email service.');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// --- API Endpoint ---
// Your main bot will send requests to this single endpoint.
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
            html: `<div>Your verification code is: <strong>${payload.verificationCode}</strong></div>` // Simplified for clarity
        };
        break;

      case 'logout_reminder':
        subject = `Action Required: Your Bot (${payload.appName}) is Offline`;
        mailOptions = {
            from: `"ULTAR'S WBD" <${GMAIL_USER}>`,
            to: payload.toEmail,
            subject: subject,
            html: `<div>Your bot <strong>${payload.appName}</strong> has been logged out. It will be deleted in ${payload.daysUntilDeletion} days if not updated.</div>` // Simplified
        };
        break;

      // Add other email types like 'payment_confirmation' here if needed.
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
