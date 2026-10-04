/**
 * Gera os PNGs de origem para o @capacitor/assets e o ícone usado na tela inicial:
 *   assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png
 *   public/icon.png (512)
 * Usa o render 3D do Cavaleiro (assets/knight-render.png, gerado por scripts/render-icon.mjs)
 * sobre um fundo em gradiente azul. Sem o render, usa assets/icon.svg.
 * Depois: capacitor-assets generate --android (feito por `npm run icons`).
 */
import sharp from 'sharp';
import { existsSync, readFileSync } from 'node:fs';

const BG = '#1b2a4a';
const gradient = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a9bff"/><stop offset="1" stop-color="#1b3a8a"/></linearGradient>
    <radialGradient id="r" cx="0.5" cy="0.42" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/><circle cx="${size / 2}" cy="${size * 0.42}" r="${size * 0.45}" fill="url(#r)"/>
</svg>`);

const hasRender = existsSync('assets/knight-render.png');
const art = hasRender
  ? readFileSync('assets/knight-render.png')
  : await sharp(readFileSync('assets/icon.svg'), { density: 300 }).resize(1024, 1024).png().toBuffer();

// Ícone completo (loja / legado): gradiente + Cavaleiro.
const bg1024 = await sharp(gradient(1024)).png().toBuffer();
const iconOnly = hasRender ? await sharp(bg1024).composite([{ input: art }]).png().toBuffer() : art;
await sharp(iconOnly).toFile('assets/icon-only.png');
await sharp(iconOnly).resize(512, 512).toFile('public/icon.png');

// Ícone adaptativo: fundo em gradiente + primeiro plano dentro da zona segura (~66%).
await sharp(bg1024).toFile('assets/icon-background.png');
const fgArt = await sharp(art).resize(700, 700).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fgArt, left: 162, top: 162 }])
  .png()
  .toFile('assets/icon-foreground.png');

// Splash: fundo escuro com o ícone arredondado no centro.
const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="900" height="900" rx="200"/></svg>');
const rounded = await sharp(iconOnly).resize(900, 900).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
for (const name of ['splash', 'splash-dark']) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
    .composite([{ input: rounded, left: 916, top: 916 }])
    .png()
    .toFile(`assets/${name}.png`);
}
console.log(`Ícones gerados (${hasRender ? 'render 3D do Cavaleiro' : 'assets/icon.svg'}).`);
