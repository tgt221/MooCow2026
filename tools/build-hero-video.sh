#!/usr/bin/env bash
# Builds the web versions of the two hero videos from the masters in
# assets-source/ (which is git-ignored and never deployed).
#
#   assets-source/hero.mp4             -> public/media/camera-720.mp4   (phones)
#                                         desktop uses public/media/hero-fallback.mp4,
#                                         built by tools/build-frames.sh
#   assets-source/showreel-master.mp4  -> public/media/reel-1080.mp4    (desktop)
#                                         public/media/reel-720.mp4     (phones / data saver)
#                                         public/media/reel-poster.webp (still shown before playback)
#
# All outputs: H.264 High, yuv420p, no audio track, +faststart — the profile
# every iOS/Android browser can autoplay inline. Bitrates are capped so the
# phone versions stream on an ordinary cellular connection.
#
# Usage:  bash tools/build-hero-video.sh
# ffmpeg not on PATH?  FFMPEG="/path/to/ffmpeg" bash tools/build-hero-video.sh
set -euo pipefail

ROOT_DIR="$(cd "${BASH_SOURCE[0]%/*}/.." && pwd)"
SRC="$ROOT_DIR/assets-source"
MEDIA="$ROOT_DIR/public/media"
FFMPEG="${FFMPEG:-ffmpeg}"

command -v "$FFMPEG" >/dev/null 2>&1 || [[ -x "$FFMPEG" ]] || { echo "ffmpeg is required (set FFMPEG=...)" >&2; exit 1; }
[[ -f "$SRC/hero.mp4" ]] || { echo "Missing $SRC/hero.mp4" >&2; exit 1; }
[[ -f "$SRC/showreel-master.mp4" ]] || { echo "Missing $SRC/showreel-master.mp4" >&2; exit 1; }
mkdir -p "$MEDIA"

x264() { # <in> <out> <width> <crf> <maxrate> <level>
  "$FFMPEG" -hide_banner -loglevel warning -y -i "$1" -an \
    -vf "scale=$3:-2:flags=lanczos" \
    -c:v libx264 -preset slow -profile:v high -level:v "$6" -pix_fmt yuv420p \
    -crf "$4" -maxrate "$5" -bufsize "$(( ${5%M} * 2 ))M" \
    -movflags +faststart "$2"
}

echo "Camera, phone version..."
x264 "$SRC/hero.mp4" "$MEDIA/camera-720.mp4" 1280 23 2M 3.1

echo "Showreel, desktop version..."
x264 "$SRC/showreel-master.mp4" "$MEDIA/reel-1080.mp4" 1920 24 5M 4.0

echo "Showreel, phone version..."
x264 "$SRC/showreel-master.mp4" "$MEDIA/reel-720.mp4" 1280 27 2M 3.1

echo "Showreel poster..."
"$FFMPEG" -hide_banner -loglevel warning -y -ss 0.2 -i "$SRC/showreel-master.mp4" -frames:v 1 \
  -vf "scale=1280:-2:flags=lanczos" -c:v libwebp -quality 80 "$MEDIA/reel-poster.webp"

echo "Hero video build complete."
ls -lh "$MEDIA"
