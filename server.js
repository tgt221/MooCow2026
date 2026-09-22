'use strict';

const path = require('path');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const nodemailer = require('nodemailer');

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 3000;
const publicDir = path.join(__dirname, 'public');
const contactWindowMs = 15 * 60 * 1000;
const contactLimit = 5;
const rateBuckets = new Map();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));
app.use(compression());
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

app.use('/frames', express.static(path.join(publicDir, 'frames'), {
  immutable: true,
  maxAge: '1y',
  fallthrough: true
}));
app.use('/media', express.static(path.join(publicDir, 'media'), {
  immutable: true,
  maxAge: '1y',
  fallthrough: true
}));
app.use(express.static(publicDir, {
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

function clean(value, max = 2000) {
  return String(value ?? '').trim().replace(/\0/g, '').slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function contactRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = rateBuckets.get(key);

  if (!current || now - current.startedAt > contactWindowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return next();
  }

  current.count += 1;
  if (current.count > contactLimit) {
    return res.status(429).json({ ok: false, message: 'Too many requests. Please wait a few minutes and try again.' });
  }

  return next();
}

app.post('/api/contact', contactRateLimit, async (req, res) => {
  const body = {
    name: clean(req.body.name, 120),
    business: clean(req.body.business, 160),
    email: clean(req.body.email, 200),
    phone: clean(req.body.phone, 80),
    projectType: clean(req.body.projectType, 120),
    budget: clean(req.body.budget, 80),
    message: clean(req.body.message, 3000),
    website: clean(req.body.website, 200)
  };

  if (body.website) {
    return res.json({ ok: true, message: 'Thanks. Your project note has been received.' });
  }

  if (!body.name || !body.business || !body.email || !body.projectType || !body.budget || !body.message || !validEmail(body.email)) {
    return res.status(400).json({ ok: false, message: 'Please complete every required field with a valid email address.' });
  }

  const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_TO'];
  const smtpReady = requiredEnv.every((key) => process.env[key]);

  if (!smtpReady) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ ok: false, message: 'The contact service is temporarily unavailable. Please email us directly.' });
    }

    console.info(`[contact:dev-stub] ${body.name} <${body.email}> — ${body.projectType}`);
    return res.json({ ok: true, message: 'Thanks. Your project note has been received.', devMode: true });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT, 10),
      secure: Number.parseInt(process.env.SMTP_PORT, 10) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const lines = [
      `Name: ${body.name}`,
      `Business: ${body.business}`,
      `Email: ${body.email}`,
      `Phone: ${body.phone || 'Not provided'}`,
      `Project type: ${body.projectType}`,
      `Monthly marketing budget: ${body.budget}`,
      '',
      body.message
    ];

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.CONTACT_TO,
      replyTo: body.email,
      subject: `New MooCow inquiry — ${body.business}`,
      text: lines.join('\n')
    });

    return res.json({ ok: true, message: 'Thanks. Your project note has been received.' });
  } catch (error) {
    console.error('[contact:error]', error?.message || 'Unknown SMTP error');
    return res.status(502).json({ ok: false, message: 'We could not send your message right now. Please try again or email us directly.' });
  }
});

app.use((req, res) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(publicDir, 'index.html'));
  }
  return res.status(404).json({ ok: false, message: 'Not found.' });
});

app.listen(port, () => {
  console.log(`MooCow site running at http://localhost:${port}`);
});
