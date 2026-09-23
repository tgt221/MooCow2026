#!/usr/bin/env bash
# Rebuilds the Reel filmstrip posters in public/media/.
#
# Each poster is pulled from the video's own YouTube thumbnail, de-letterboxed,
# centre-cropped to 4:5 and written as WebP. They are deliberately soft — the
# poster gradient under them and the wash over them carry the design, so the
# still only has to suggest the film. Swap in real shot stills whenever they
# exist: keep the same filenames and the 4:5 ratio and nothing else changes.
#
# Needs: curl, ffmpeg/ffprobe. Run from anywhere.
set -euo pipefail

out="$(cd "$(dirname "$0")/.." && pwd)/public/media"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# id:name:xshift:zoom:yshift — order matches the figures in public/index.html.
#   xshift  where the 4:5 window sits across the frame. 0 = hard left, 1 = right.
#   zoom    fraction of frame height the window takes. 1 = full height.
#   yshift  where the window sits vertically once zoomed. 0 = top, 1 = bottom.
# A plain centre crop slices the titles baked into some of these frames in half,
# which reads as a mistake, so each window is nudged onto its subject and off
# the type. Re-tune these three numbers rather than editing the images by hand.
frames=(
  "BJ1SYShC2mc:work-sahale:0.74:1:0.5"      # right, to clear "SNACK BETTER" entirely
  "a7Rs2cM4D3s:work-unknown2man:0.5:1:0.5"  # group is already centred
  "Ages8oVlYtw:work-shesaid:0.30:0.76:1"    # in and down, under the "COMING SOON" band
  "KDug5su6TGU:work-realestate:0.5:1:0.5"
  "8fyfOantCh0:work-storyline:0.5:1:0.5"
  "PWyqA9bqEiA:work-kaiser:0.72:1:0.5"      # right, to clear the lower-third name plate
)

for pair in "${frames[@]}"; do
  IFS=: read -r id name xshift zoom yshift <<< "$pair"
  # maxresdefault is 1280x720 but is not generated for every upload; hqdefault
  # (480x360, pillarboxed) always exists.
  curl -sfL -o "$tmp/$name.jpg" "https://img.youtube.com/vi/$id/maxresdefault.jpg" \
    || curl -sfL -o "$tmp/$name.jpg" "https://img.youtube.com/vi/$id/hqdefault.jpg"

  # cropdetect needs several frames to settle, hence -loop.
  crop="$(ffmpeg -hide_banner -loop 1 -i "$tmp/$name.jpg" -vf cropdetect=24:2:0 -frames:v 30 -f null - 2>&1 \
    | grep -o 'crop=[0-9]*:[0-9]*:[0-9]*:[0-9]*' | tail -1)"
  crop="${crop:-crop=in_w:in_h:0:0}"

  ffmpeg -hide_banner -v error -y -i "$tmp/$name.jpg" \
    -vf "${crop},crop='min(iw,ih*4/5*${zoom})':'min(ih*${zoom},iw*5/4)':'(iw-out_w)*${xshift}':'(ih-out_h)*${yshift}',scale=720:900:flags=lanczos,unsharp=5:5:0.6" \
    -q:v 82 "$out/$name.webp"
  printf '%-22s %s\n' "$name.webp" "$(wc -c < "$out/$name.webp") bytes"
done
