const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  await import('sharp').catch(() => {});
})();

async function main() {
  let sharpLib;
  try {
    sharpLib = require('sharp');
  } catch {
    const { execSync } = require('child_process');
    execSync('npm install sharp --no-save', { stdio: 'inherit', cwd: 'D:/GW/GandKWedding' });
    sharpLib = require('sharp');
  }

  const srcPath = 'D:/GW/GandKWedding/public/images/og-invite.jpg';
  const { data, info } = await sharpLib(srcPath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;

  const sample = (y) => {
    let sum = 0;
    let n = 0;
    let bright = 0;
    let dark = 0;
    for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x += 2) {
      const i = (y * w + x) * ch;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum;
      n++;
      if (lum > 200) bright++;
      if (lum < 50) dark++;
    }
    return { avg: sum / n, brightRatio: bright / n, darkRatio: dark / n };
  };

  // Find top brown bar end, then any bright gap, then photo start
  let y = 0;
  while (y < h && sample(y).darkRatio > 0.7) y++;
  const topBarEnd = y;
  while (y < h && sample(y).brightRatio > 0.35) y++;
  const photoTop = y;

  y = h - 1;
  while (y > 0 && sample(y).darkRatio > 0.7) y--;
  const bottomBarStart = y + 1;
  while (y > 0 && sample(y).brightRatio > 0.35) y--;
  const photoBottom = y;

  console.log({ topBarEnd, photoTop, photoBottom, bottomBarStart, h });

  // Extract photo region only (between bars, skipping white gaps), then composite
  // back into full canvas with solid brown bars flush to the photo edges.
  const photoH = photoBottom - photoTop + 1;
  const photo = await sharpLib(srcPath)
    .extract({ left: 0, top: photoTop, width: w, height: photoH })
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .toBuffer();

  // Soft brown bars (~3.5% each) flush — no white gap
  const barH = Math.max(36, Math.round(h * 0.04));
  const barColor = { r: 45, g: 28, b: 20 };
  const topBar = await sharpLib({
    create: { width: w, height: barH, channels: 3, background: barColor },
  })
    .png()
    .toBuffer();
  const botBar = topBar;

  const out = await sharpLib(photo)
    .composite([
      { input: topBar, top: 0, left: 0 },
      { input: botBar, top: h - barH, left: 0 },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  const tmp = path.join('D:/GW/GandKWedding/public/images', `og-fix-${Date.now()}.jpg`);
  fs.writeFileSync(tmp, out);
  for (const name of ['og-invite.jpg', 'og-banner.jpg']) {
    const dest = path.join('D:/GW/GandKWedding/public/images', name);
    fs.copyFileSync(tmp, dest);
  }
  fs.unlinkSync(tmp);
  console.log('fixed margins', out.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
