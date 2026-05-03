#!/usr/bin/env bash
# Converts hero.mp4 to hero.webm using ffmpeg (available in Netlify build env).
set -e
SRC="videos/hero.mp4"
DEST="videos/hero.webm"
if [ ! -f "$DEST" ]; then
  echo "Converting $SRC → $DEST"
  ffmpeg -i "$SRC" -c:v libvpx-vp9 -crf 33 -b:v 0 -an "$DEST"
  echo "Done: $DEST"
else
  echo "Skipped: $DEST already exists"
fi
