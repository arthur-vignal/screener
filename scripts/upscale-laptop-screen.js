// One-off: upscale /public/laptop-screen.jpg 2x com lanczos3 + light sharpen.
// 1280x699 → 2560x1398 (~5x file size, fica nítido em retina macbook).
const sharp = require('sharp');
const fs = require('fs');

(async () => {
  const src = 'C:/Users/vigna/projects/sulfur/public/laptop-screen.jpg';
  const tmp = 'C:/Users/vigna/projects/sulfur/public/laptop-screen@2x.jpg';

  const img = sharp(src);
  const meta = await img.metadata();
  console.log('orig:', meta.width, 'x', meta.height);

  await sharp(src)
    .resize({
      width: meta.width * 2,
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 1.2 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(tmp);

  const out = await sharp(tmp).metadata();
  const sz = fs.statSync(tmp).size;
  console.log('out:', out.width, 'x', out.height, '|', (sz / 1024).toFixed(0), 'KB');
})().catch((e) => { console.error(e); process.exit(1); });
