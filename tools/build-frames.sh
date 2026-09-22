#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "${BASH_SOURCE[0]%/*}/.." && pwd)"
SOURCE="${1:-$ROOT_DIR/assets-source/hero.mp4}"
FRAMES="$ROOT_DIR/public/frames"
MEDIA="$ROOT_DIR/public/media"

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is required" >&2; exit 1; }
[[ -f "$SOURCE" ]] || { echo "Hero source not found: $SOURCE" >&2; exit 1; }

mkdir -p "$FRAMES/hero-2x" "$FRAMES/hero" "$FRAMES/hero-sm" "$FRAMES/hero-jpg" "$MEDIA"
rm -f "$FRAMES/hero-2x"/* "$FRAMES/hero"/* "$FRAMES/hero-sm"/* "$FRAMES/hero-jpg"/*

echo "Extracting native 1920px WebP frames..."
ffmpeg -hide_banner -loglevel warning -y -i "$SOURCE" -an -fps_mode passthrough \
  -c:v libwebp -quality 88 -compression_level 4 -start_number 1 \
  "$FRAMES/hero-2x/frame_%04d.webp"

echo "Extracting desktop 1440px WebP frames..."
ffmpeg -hide_banner -loglevel warning -y -i "$SOURCE" -an -vf "scale=1440:-2:flags=lanczos" -fps_mode passthrough \
  -c:v libwebp -quality 86 -compression_level 4 -start_number 1 \
  "$FRAMES/hero/frame_%04d.webp"

echo "Extracting mobile 900px WebP frames (every second source frame)..."
ffmpeg -hide_banner -loglevel warning -y -i "$SOURCE" -an \
  -vf "select='not(mod(n,2))',scale=900:-2:flags=lanczos" -fps_mode passthrough \
  -c:v libwebp -quality 82 -compression_level 4 -start_number 1 \
  "$FRAMES/hero-sm/frame_%04d.webp"

echo "Extracting desktop JPEG fallback frames..."
ffmpeg -hide_banner -loglevel warning -y -i "$SOURCE" -an -vf "scale=1440:-2:flags=lanczos" -fps_mode passthrough \
  -q:v 2 -start_number 1 "$FRAMES/hero-jpg/frame_%04d.jpg"

echo "Building reduced-motion / preload-timeout fallback video..."
ffmpeg -hide_banner -loglevel warning -y -i "$SOURCE" -an \
  -vf "scale=1920:-2:flags=lanczos" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart "$MEDIA/hero-fallback.mp4"

echo "Hero media build complete."
