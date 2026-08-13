/**
 * Regenerates every branding asset from a single source artwork.
 *
 * Run with `node scripts/generate-icons.mjs`. Requires `sharp` (a devDependency).
 *
 * The source is the app's own 1920px master. Everything downstream — PWA icons,
 * the Apple touch icon, the maskable variant and favicon.ico — is derived here
 * so the branding cannot drift out of sync between formats again.
 */

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const SOURCE = "brand/icon-master.png";

/** Page background, so padded and flattened variants sit on brand ivory. */
const BRAND_BG = { r: 250, g: 248, b: 245, alpha: 1 };

/** Plain square PNGs at the sizes the manifest and HTML reference. */
const SQUARE_ICONS = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["public/favicon-96.png", 96],
];

async function main() {
  for (const [path, size] of SQUARE_ICONS) {
    const buffer = await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(path, buffer);
    console.log(`${path} — ${size}px, ${(buffer.length / 1024).toFixed(1)}KB`);
  }

  // Maskable icon: Android crops to arbitrary shapes, and anything outside the
  // central 80% "safe zone" can be clipped. Scale the art down and pad so no
  // part of the mark is ever cut off.
  const inner = Math.round(512 * 0.78);
  const pad = Math.round((512 - inner) / 2);
  const maskable = await sharp(SOURCE)
    .resize(inner, inner, { fit: "cover" })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: BRAND_BG })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile("public/icon-512-maskable.png", maskable);
  console.log(`public/icon-512-maskable.png — 512px, ${(maskable.length / 1024).toFixed(1)}KB`);

  // Apple touch icons are composited onto white by iOS and cannot be
  // transparent, so flatten onto the brand background.
  const appleTouch = await sharp(SOURCE)
    .resize(180, 180, { fit: "cover" })
    .flatten({ background: BRAND_BG })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile("public/apple-touch-icon.png", appleTouch);

  await writeFile("public/favicon.ico", await buildIco([16, 32, 48]));
  console.log("public/favicon.ico — 16/32/48px");
}

/**
 * Builds a multi-resolution `.ico` from the source artwork.
 *
 * Written by hand because sharp has no ICO encoder. The format is a small
 * directory header followed by the raw image payloads; PNG-compressed entries
 * are supported by every browser still in use, and are far smaller than the
 * uncompressed BMP form the format originally specified.
 */
async function buildIco(sizes) {
  const images = await Promise.all(
    sizes.map((size) =>
      sharp(SOURCE)
        .resize(size, size, { fit: "cover" })
        .flatten({ background: BRAND_BG })
        .png({ compressionLevel: 9 })
        .toBuffer(),
    ),
  );

  const HEADER_BYTES = 6;
  const ENTRY_BYTES = 16;

  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt16LE(0, 0); // Reserved.
  header.writeUInt16LE(1, 2); // 1 = icon (2 would be cursor).
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER_BYTES + ENTRY_BYTES * images.length;

  const entries = images.map((image, index) => {
    const entry = Buffer.alloc(ENTRY_BYTES);
    const size = sizes[index];

    // 0 encodes 256 — the field is a single byte.
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // Palette size; 0 for truecolour.
    entry.writeUInt8(0, 3); // Reserved.
    entry.writeUInt16LE(1, 4); // Colour planes.
    entry.writeUInt16LE(32, 6); // Bits per pixel.
    entry.writeUInt32LE(image.length, 8);
    entry.writeUInt32LE(offset, 12);

    offset += image.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images]);
}

await main();
