# MooCow Productions — cinematic one-page site

A production-ready, no-build-step website for MooCow Productions. The hero uses a canvas image-sequence scrub driven by scroll; the server provides static delivery, security headers, compression, and an SMTP contact endpoint.

## Requirements

- Node.js 18 or newer
- npm
- ffmpeg and ffprobe only when rebuilding hero media

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

When SMTP variables are absent and `NODE_ENV` is not `production`, the contact endpoint uses a safe local success stub so the complete UI can be tested without sending email.

## Environment variables

Copy `.env.example` to `.env` for local use (or set the values in your process manager):

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port; use `465` for implicit TLS or commonly `587` for STARTTLS |
| `SMTP_USER` | SMTP login and message sender |
| `SMTP_PASS` | SMTP password or app password |
| `CONTACT_TO` | Inbox that receives project inquiries |
| `PORT` | Local port only; Hostinger supplies this automatically |

Never commit `.env`.

## Rebuild the hero sequence

Put the replacement master at `assets-source/hero.mp4`, then run:

```bash
bash tools/build-frames.sh
```

The script regenerates:

- `public/frames/hero-2x/`: 250 native-width 1920px WebP frames, quality 88
- `public/frames/hero/`: 250 1440px WebP frames, quality 86
- `public/frames/hero-sm/`: 125 900px WebP frames, quality 82
- `public/frames/hero-jpg/`: 250 1440px JPEG fallback frames
- `public/media/hero-fallback.mp4`: muted 1080p H.264 fallback

The source must be a 250-frame, 25fps, 10-second disperse sequence for the existing scroll mapping. Check it first with:

```bash
ffprobe -v error -count_frames \
  -show_entries stream=codec_name,width,height,pix_fmt,r_frame_rate,duration,bit_rate,nb_frames,nb_read_frames \
  -of json assets-source/hero.mp4
```

Raw files in `assets-source/` are intentionally ignored and never served.

## Content media drop-ins

The current build intentionally uses type, line work, glow, and negative space because the named content assets were not supplied. Correctly sized insertion comments are in `public/index.html` for:

- `service-business`, `service-social`, `service-construction`, `service-management`, `service-photo`
- `work-01` through `work-06`
- `about-portrait`

For video, add `muted loop playsinline` and the `data-lazy-video data-src="/media/file.mp4"` attributes. For images, use `data-lazy-image data-src="/media/file.webp"`; the existing IntersectionObserver loads them near the viewport and pauses offscreen video.

## Deploy on Hostinger

1. Push this repository to GitHub.
2. In Hostinger, create a **Node.js Web App** and connect the GitHub repository.
3. Select Node.js 18 or newer.
4. Set the start command to `npm start` (equivalent to `node server.js`).
5. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `CONTACT_TO` in Hostinger’s environment-variable panel.
6. Do not hardcode or override `PORT`; Hostinger injects it.
7. Deploy. The generated frame tiers are committed, so ffmpeg is not required on Hostinger for this version.
8. Verify the public contact form after deployment; production deliberately returns a generic unavailable state if SMTP is not configured.

Static `/frames` and `/media` responses use immutable one-year cache headers. HTML is served with `no-cache`, while CSS and JavaScript use one-hour caching plus versioned URLs.

## Local visual QA helpers

These query parameters work only on `localhost`, `127.0.0.1`, or `::1`:

- `?qa-dpr=2` exercises the exact 2× canvas backing-store path.
- `?qa-reduced-motion=1` mirrors the reduced-motion path without changing OS settings.
- `?qa-force-fallback=1` forces the H.264 fallback video and loader unlock path.
