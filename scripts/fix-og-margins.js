const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    require('sharp');
  } catch {
    require('child_process').execSync('npm install sharp --no-save', {
      stdio: 'inherit',
      cwd: 'D:/GW/GandKWedding',
    });
  }

  const sharpLib = require('sharp');
  const srcPath = 'D:/GW/GandKWedding/public/images/og-invite.jpg';
  const { data, info } = await sharpLib(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const px = (x, y) => (y * w + x) * ch;

  const rowAvg = (y) => {
    let s = 0;
    let n = 0;
    for (let x = 0; x < w; x += 2) {
      const i = px(x, y);
      s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      n++;
    }
    return s / n;
  };

  const isWhiteGap = (y) => rowAvg(y) > 210;
  const isDarkBar = (y) => rowAvg(y) < 55;

  // Top: find bar, then white gap; fill gap with bar color from last bar row
  let y = 0;
  while (y < h && isDarkBar(y)) y++;
  const topBarLast = Math.max(0, y - 1);
  const topGapStart = y;
  while (y < h && isWhiteGap(y)) y++;
  const topGapEnd = y; // exclusive

  // Bottom
  y = h - 1;
  while (y >= 0 && isDarkBar(y)) y--;
  const botBarFirst = Math.min(h - 1, y + 1);
  const botGapEnd = botBarFirst; // exclusive end of gap
  while (y >= 0 && isWhiteGap(y)) y--;
  const botGapStart = y + 1;

  console.log({
    topBarLast,
    topGapStart,
    topGapEnd,
    botGapStart,
    botGapEnd,
    botBarFirst,
  });

  const fillRowFrom = (targetY, sourceY) => {
    for (let x = 0; x < w; x++) {
      const ti = px(x, targetY);
      const si = px(x, sourceY);
      data[ti] = data[si];
      data[ti + 1] = data[si + 1];
      data[ti + 2] = data[si + 2];
      data[ti + 3] = 255;
    }
  };

  for (let r = topGapStart; r < topGapEnd; r++) fillRowFrom(r, topBarLast);
  for (let r = botGapStart; r < botGapEnd; r++) fillRowFrom(r, botBarFirst);

  const out = await sharpLib(Buffer.from(data), {
    raw: { width: w, height: h, channels: ch },
  })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const tmp = path.join('D:/GW/GandKWedding/public/images', `og-fix-${Date.now()}.jpg`);
  fs.writeFileSync(tmp, out);
  fs.copyFileSync(tmp, 'D:/GW/GandKWedding/public/images/og-invite.jpg');
  fs.copyFileSync(tmp, 'D:/GW/GandKWedding/public/images/og-banner.jpg');
  fs.unlinkSync(tmp);
  console.log('patched white gaps', out.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
