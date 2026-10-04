/**
 * Converte um GIF animado (pixel art) numa sprite sheet horizontal para o SpriteActor.
 *   node scripts/gif-to-sheet.mjs caminho/do.gif public/models/sprites/skeleton_king/idle_sheet.png
 * Depois ajuste SPRITE_BOSS.anim.frames em src/config/visual.ts com o número impresso.
 */
import sharp from 'sharp';

const [, , input, output] = process.argv;
const meta = await sharp(input, { animated: true }).metadata();
const frames = meta.pages ?? 1;
const w = meta.width;
const h = meta.pageHeight ?? meta.height;
const parts = [];
for (let i = 0; i < frames; i++) {
  const buf = await sharp(input, { page: i }).png().toBuffer();
  parts.push({ input: buf, left: i * w, top: 0 });
}
await sharp({ create: { width: w * frames, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(parts)
  .png()
  .toFile(output);
console.log(`${frames} frames de ${w}×${h} → ${output} (delay: ${meta.delay?.join(',') ?? '?'} ms)`);
