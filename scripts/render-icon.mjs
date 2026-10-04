/**
 * Gera assets/knight-render.png renderizando o knight.glb com Three.js num Chromium headless.
 * Requer Playwright (npx playwright) e o servidor do Vite: roda `vite` sozinho numa porta livre.
 *   node scripts/render-icon.mjs && npm run icons
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
await page.goto('http://localhost:5199/tools/render-icon.html');
await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
const png = await page.locator('canvas').screenshot({ omitBackground: true });
writeFileSync('assets/knight-render.png', png);
await browser.close();
await server.close();
console.log('assets/knight-render.png gerado');
