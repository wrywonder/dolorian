#!/usr/bin/env sh
# Pulls the exact font files the app ships (plus the two the refresh adds)
# from npm into ./fonts, and copies the app icon into ./assets.
set -e
cd "$(dirname "$0")"
mkdir -p fonts assets .pkg
for p in instrument-serif plus-jakarta-sans space-grotesk bricolage-grotesque dm-mono; do
  (cd .pkg && npm pack "@expo-google-fonts/$p@0.4.1" --silent >/dev/null && tar -xzf "expo-google-fonts-$p-0.4.1.tgz" && cp package/*/*.ttf ../fonts/ && rm -rf package)
done
rm -rf .pkg
cp ../../../assets/icon-village.png assets/
