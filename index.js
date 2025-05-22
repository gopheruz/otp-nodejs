const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many OTP requests from this IP, please try again later'
});
const otpStore = new Map();
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD.replace(/\s+/g, '') // Remove spaces from app password
    }
});

transporter.verify((error) => {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server Ready');
    }
});

app.post('/send-otp', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        const otp = generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        otpStore.set(email, { otp, expiresAt, attempts: 0 });

        await transporter.sendMail({
            from: `"OTP Service" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Tasdiqlash kodi',
            text: `Siznig tasdiqlash kodingiz ${otp}`,
            html: `<p>Your OTP code is <strong>${otp}</strong></p>
             <p>Valid for 10 minutes</p>`
        });

        console.log(`OTP sent to ${email}`);
        return res.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error('Send OTP Error:', error);
        return res.status(500).json({ error: 'Failed to send OTP' });
    }
});

app.post('/verify-otp', (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const storedData = otpStore.get(email);
        if (!storedData) {
            return res.status(400).json({ error: 'OTP expired or not found' });
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'OTP expired' });
        }

        if (storedData.otp !== otp) {
            storedData.attempts++;
            if (storedData.attempts >= 3) {
                otpStore.delete(email);
                return res.status(400).json({ error: 'Too many attempts' });
            }
            otpStore.set(email, storedData);
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        otpStore.delete(email);
        return res.json({ success: true, message: 'OTP verified' });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});