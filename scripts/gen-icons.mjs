/**
 * Gera os PNGs de origem para o @capacitor/assets a partir de assets/icon.svg:
 *   assets/icon-only.png (1024), icon-foreground.png, icon-background.png, splash.png, splash-dark.png
 * Depois rode: npm run assets:generate
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('assets/icon.svg');
const BG = '#1b2a4a';

await sharp(svg, { density: 300 }).resize(1024, 1024).png().toFile('assets/icon-only.png');

// Ícone adaptativo: fundo em gradiente azul + primeiro plano (o próprio ícone reduzido na zona segura).
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: '#2f63d6' },
})
  .png()
  .toFile('assets/icon-background.png');
const fg = await sharp(svg, { density: 300 }).resize(700, 700).png().toBuffer();
const mask = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700"><circle cx="350" cy="350" r="350"/></svg>',
);
const round = await sharp(fg).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: round, left: 162, top: 162 }])
  .png()
  .toFile('assets/icon-foreground.png');

// Splash: fundo escuro com o ícone arredondado no centro.
for (const name of ['splash', 'splash-dark']) {
  const icon = await sharp(svg, { density: 300 }).resize(900, 900).png().toBuffer();
  const m = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="900" height="900" rx="200"/></svg>',
  );
  const r = await sharp(icon).composite([{ input: m, blend: 'dest-in' }]).png().toBuffer();
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
    .composite([{ input: r, left: 916, top: 916 }])
    .png()
    .toFile(`assets/${name}.png`);
}
console.log('PNGs gerados em assets/');
