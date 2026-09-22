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
| `NODE_ENV` | Set to `production` on Hostinger. Turns on the `upgrade-insecure-requests` security header (off locally, where it breaks links between pages on `http://localhost`) and the strict contact-form behaviour |

Never commit `.env`.

## Service pages

The four "Content details & investment" pages live at `/services/<slug>/` and are **generated** — don't edit their HTML by hand.

1. Edit copy or prices in `tools/service-pages.data.js`.
2. Run `npm run build:pages`.
3. Commit the regenerated `public/services/` files (Hostinger never runs a build).

The pricing in the data file is a **proposal** drafted from 2026 market research. On `localhost` a yellow "Proposed pricing" note appears above each rate card; it never shows on the live site, so review the numbers before you publish.

Old WordPress URLs (`/corporate/`, `/socialmediacontent/`, `/construction/`, `/socialmedia2`, `/about/`, `/contact/`, `/portfolio/`, `/home/`) permanently redirect (301) to their new homes — see `legacyRedirects` in `server.js`. Keep these after WordPress is retired: they carry the old pages' search ranking.

Each "Choose …" button links to `/?service=…&package=…#contact`, which ticks the matching service on the call sheet and pre-fills the message. The `chip` value in the data file must exactly match a call-sheet checkbox value.

## Hero video

The hero plays the camera-explode clip once, then crossfades into the looping showreel. Everything is self-hosted in `public/media/` — nothing loads from the old WordPress site.

| Screen | Camera clip | Showreel |
| --- | --- | --- |
| Desktop | `hero-fallback.mp4` (1080p, 6.6 MB) | `reel-1080.mp4` (1080p, ~19 MB) |
| Phones, Data Saver, 2G/3G | `camera-720.mp4` (720p, ~1.8 MB) | `reel-720.mp4` (720p, ~8 MB) |

`app.js` picks the files by screen size and connection. All files are H.264 High / yuv420p / no audio / faststart — the profile every iOS and Android browser will autoplay inline.

**Autoplay refused** (iPhone Low Power Mode, Android Data Saver): the hero keeps the camera still on screen and starts playback on the visitor's first tap. **Page opened in a background tab:** Chrome aborts the first play() to save power; the hero resumes as soon as the tab is shown. The hero only crossfades to the showreel once the showreel is actually playing, so it is never left black.

Rebuild the web versions after replacing a master in `assets-source/` (`hero.mp4`, `showreel-master.mp4`):

```bash
bash tools/build-hero-video.sh
```

`/media` is served with a one-year immutable cache, so **give a re-encoded file a new name** (and update `data-src-*` in `index.html`) or returning visitors will keep the old one.

Local QA: `?qa-block-autoplay=1` refuses playback until the first tap, reproducing Low Power Mode.

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
5. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`, and `NODE_ENV=production` in Hostinger’s environment-variable panel.
6. Do not hardcode or override `PORT`; Hostinger injects it.
7. Deploy. All web media in `public/` is committed (largest file ~19 MB, well under GitHub's 100 MB limit), so ffmpeg is not required on Hostinger. `assets-source/` is git-ignored and never deployed — nothing on the live site may point at it.
8. Verify the public contact form after deployment; production deliberately returns a generic unavailable state if SMTP is not configured.

Static `/frames` and `/media` responses use immutable one-year cache headers. HTML is served with `no-cache`, while CSS and JavaScript use one-hour caching plus versioned URLs.

## Local visual QA helpers

These query parameters work only on `localhost`, `127.0.0.1`, or `::1`:

- `?qa-reduced-motion=1` mirrors the reduced-motion path without changing OS settings.
- `?qa-block-autoplay=1` refuses video playback until the first tap, like iPhone Low Power Mode / Android Data Saver.
