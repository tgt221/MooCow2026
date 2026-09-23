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
      // challenges.cloudflare.com = Turnstile (the "I am human" check).
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://challenges.cloudflare.com'],
      frameSrc: ["'self'", 'https://challenges.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      // All media is self-hosted now; nothing loads from the old WordPress site.
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      // Production only. On http://localhost this rewrites same-origin page
      // navigations to https://localhost, which doesn't exist, so every link
      // to another page (e.g. /services/…) fails in local testing.
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));
app.use(compression());
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

// Old WordPress URLs → their new homes. 301 (permanent) so search engines pass
// the old pages' ranking to the new ones, and shared links keep working after
// WordPress is retired. Express's default non-strict routing means each entry
// matches with or without a trailing slash.
const legacyRedirects = {
  '/corporate': '/services/business-content/',
  '/socialmediacontent': '/services/social-media-content/',
  '/construction': '/services/construction/',
  '/socialmedia2': '/services/social-media-management/',
  '/socialmedia': '/services/social-media-management/',
  '/home': '/',
  '/about': '/#about',
  '/portfolio': '/#work',
  '/contact': '/#contact'
};
for (const [from, to] of Object.entries(legacyRedirects)) {
  app.get(from, (req, res) => res.redirect(301, to));
}

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
// Note: assets-source/ holds raw masters. It is git-ignored and must never be
// served — every file the site uses is built into public/ (tools/build-*.sh).
app.use(express.static(publicDir, {
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Tells the page whether a human check is configured. The site key is public
// by design; the secret never leaves the server.
app.get('/api/config', (req, res) => {
  res.json({ turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null });
});

/**
 * Cloudflare Turnstile verification. Returns true when no secret is set, so
 * the form keeps working until the keys are added.
 */
async function passesHumanCheck(token, ip) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set('remoteip', ip);
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const result = await verify.json();
    return result.success === true;
  } catch (error) {
    console.error('[turnstile:error]', error?.message || 'verification failed');
    return false; // fail closed: a broken check must not become an open door
  }
}

const REQUIRED_SMTP = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_TO'];

// Values pasted into a hosting panel routinely arrive with a trailing space or
// wrapped in quotes. Both are sent verbatim and look exactly like a wrong
// password, so strip them here rather than chasing a phantom 535 later.
function env(key) {
  return String(process.env[key] ?? '').trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
}

const smtpConfigured = () => REQUIRED_SMTP.every((key) => env(key));

function makeTransport() {
  const port = Number.parseInt(env('SMTP_PORT'), 10);
  return nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    // 465 = implicit TLS. 587 (and 25) start plain and upgrade via STARTTLS.
    secure: port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') }
  });
}

/** Logs why a send failed in terms that point at the fix. */
function describeSmtpError(error) {
  const code = error?.code || error?.responseCode || 'unknown';
  const hints = {
    EAUTH: 'username or password rejected — SMTP_USER must be the full email address',
    ECONNECTION: 'could not reach the mail server — check SMTP_HOST and SMTP_PORT',
    ETIMEDOUT: 'connection timed out — the host may block this port; try 587 instead of 465',
    ESOCKET: 'TLS/socket problem — usually the wrong port for the security mode (465 vs 587)',
    EENVELOPE: 'the from/to address was rejected — SMTP_USER must be allowed to send as itself'
  };
  return `${code}: ${error?.message || 'no message'}${hints[code] ? ` | likely cause: ${hints[code]}` : ''}`;
}

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

// The "call sheet" form. `nickname` is the hidden honeypot — it must not be
// called `website`, because the call sheet has a real Website field.
app.post('/api/contact', contactRateLimit, async (req, res) => {
  const rawServices = Array.isArray(req.body.services)
    ? req.body.services
    : (req.body.services ? [req.body.services] : []);

  const body = {
    first: clean(req.body.first, 80),
    last: clean(req.body.last, 80),
    email: clean(req.body.email, 200),
    phone: clean(req.body.phone, 80),
    company: clean(req.body.company, 160),
    site: clean(req.body.site, 200),
    services: rawServices.slice(0, 12).map((s) => clean(s, 60)).filter(Boolean),
    budget: clean(req.body.budget, 80),
    message: clean(req.body.message, 3000),
    heard: clean(req.body.heard, 80),
    nickname: clean(req.body.nickname, 200)
  };
  const fullName = `${body.first} ${body.last}`.trim();
  const thanks = `Got it, ${body.first || 'thanks'} — we'll be in touch shortly.`;

  // 1. Honeypot. Answer as if it worked so the bot doesn't retry, but send nothing.
  if (body.nickname) {
    console.info('[contact:blocked] honeypot filled');
    return res.json({ ok: true, message: thanks });
  }

  // 2. Time trap. No human completes this form in under three seconds.
  //    A missing/garbled stamp is treated as suspicious too.
  const elapsed = Date.now() - Number.parseInt(req.body.loadedAt, 10);
  if (!Number.isFinite(elapsed) || elapsed < 3000) {
    console.info(`[contact:blocked] time trap (${Number.isFinite(elapsed) ? elapsed + 'ms' : 'no stamp'})`);
    return res.json({ ok: true, message: thanks });
  }

  // 3. Turnstile, when configured.
  if (!(await passesHumanCheck(req.body['cf-turnstile-response'], req.ip))) {
    console.info('[contact:blocked] human check failed');
    return res.status(400).json({ ok: false, message: "Please complete the “I am human” check and try again." });
  }

  if (!body.first || !body.last || !validEmail(body.email)) {
    return res.status(400).json({ ok: false, message: 'Please add your first and last name and a valid email address.' });
  }

  const smtpReady = smtpConfigured();

  if (!smtpReady) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ ok: false, message: 'The contact service is temporarily unavailable. Please email us directly.' });
    }

    console.info(`[contact:dev-stub] ${fullName} <${body.email}> — ${body.services.join(', ') || 'no services selected'}`);
    return res.json({ ok: true, message: thanks, devMode: true });
  }

  try {
    const transporter = makeTransport();

    const lines = [
      `Name: ${fullName}`,
      `Company: ${body.company || 'Not provided'}`,
      `Email: ${body.email}`,
      `Phone: ${body.phone || 'Not provided'}`,
      `Website: ${body.site || 'Not provided'}`,
      `Services: ${body.services.join(', ') || 'None selected'}`,
      `Monthly marketing budget: ${body.budget || 'Not selected'}`,
      `Heard about us via: ${body.heard || 'Not selected'}`,
      '',
      body.message || '(No message)'
    ];

    await transporter.sendMail({
      from: env('SMTP_USER'),
      to: env('CONTACT_TO'),
      replyTo: body.email,
      subject: `New MooCow call sheet — ${body.company || fullName}`,
      text: lines.join('\n')
    });

    return res.json({ ok: true, message: thanks });
  } catch (error) {
    console.error('[contact:error]', describeSmtpError(error));
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

  // Check the mail settings at boot so the deploy log says whether the contact
  // form can actually send — instead of only finding out when a visitor tries.
  if (!smtpConfigured()) {
    const missing = REQUIRED_SMTP.filter((key) => !process.env[key]);
    console.warn(`[smtp] not configured — contact form disabled. Missing: ${missing.join(', ')}`);
    return;
  }
  // Never log the password. Its length, and whether stray quotes/spaces had to
  // be trimmed off it, are enough to tell a typo from a genuinely wrong password.
  const tidied = REQUIRED_SMTP.filter((key) => process.env[key] !== env(key));
  console.log(`[smtp] testing ${env('SMTP_USER')} via ${env('SMTP_HOST')}:${env('SMTP_PORT')}`
    + ` — pass is ${env('SMTP_PASS').length} chars`
    + (tidied.length ? `; trimmed stray quotes/spaces from: ${tidied.join(', ')}` : '') + '…');
  makeTransport().verify()
    .then(() => console.log('[smtp] OK — the contact form can send mail'))
    .catch((error) => console.error('[smtp] FAILED —', describeSmtpError(error)));
});
