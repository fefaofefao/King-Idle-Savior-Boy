import { chromium } from 'playwright'; // npm i -D playwright (ou caminho global)
// Uso: npm run build && npx vite preview --port 4173, depois: node scripts/store/screenshots.mjs
const OUT = process.env.OUT ?? new URL('../../store-listing/screenshots', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const errs = [];
for (const [lang, locale] of [['pt-BR', 'pt-BR'], ['en', 'en-US'], ['es', 'es-ES']]) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, locale, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(lang + ': ' + e.message));
  await page.goto('http://localhost:4173/');
  await page.waitForSelector('.ts-play.ready', { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${lang}/01-title.png` });
  await page.click('.ts-play', { force: true });
  await page.waitForTimeout(1200);
  await page.click('.modal .btn.primary', { force: true });
  await page.waitForTimeout(300);
  // Estado de um jogador no meio do jogo.
  await page.evaluate((lang) => {
    const a = window.__app; const s = a.state;
    s.tutorial.tapHintDone = true;
    document.querySelectorAll('.tap-hint').forEach((e) => e.remove());
    s.gold = s.gold.plus(4.2e6); s.crystals = s.crystals.plus(2.4e5);
    s.bladeLevel = 142; s.guild = [86, 74, 61, 52, 40, 25, 10, 0]; s.arcaneLevel = 4;
    s.stage = 12; s.maxStage = 172; s.stats.highestStage = 172; s.stats.bossKills = 64; s.stats.prestiges = 6;
    s.stats.goldenKills = 31; s.stats.taps = 48000; s.stats.kills = 9100; s.stats.crits = 2100; s.stats.weakHits = 700; s.stats.maxCombo = 420;
    s.relics = { sword: 7, banner: 5, purse: 6, eye: 3, crown: 4, clover: 2, hourglass: 3, lens: 2 };
    s.bestiary = { minion: 2400, slime: 1500, rogue: 900, skmage: 700, mushroom: 500, bat: 300, fallen: 150, witch: 90, golem: 40, imp: 20, general: 60, king: 3 };
    s.crystalUpgrades = { damage: 9, gold: 6, crit: 4, bossTime: 3, offline: 2, cooldown: 1 };
    s.story.index = 63; s.skin = 'royal';
    a.setLanguage(lang);
    a.scene.setKnightSkin('royal');
    a.scene.setMageVisible(true);
    a.game.spawnEnemy();
    a.game.checkAchievements();
  }, lang);
  await page.waitForTimeout(3500); // cartões de prêmio somem
  await page.evaluate(() => { const f = window.__app.floaters; f['lootQueue'] = []; document.querySelectorAll('.loot-card,.toast').forEach((e) => e.remove()); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const f = window.__app.floaters; f['lootQueue'] = []; f['lootShowing'] = false; document.querySelectorAll('.loot-card,.toast').forEach((e) => e.remove()); });
  // 2: combate com combo e dano
  for (let i = 0; i < 14; i++) { await page.touchscreen.tap(250, 270); await page.waitForTimeout(40); }
  await page.evaluate(() => { const g = window.__app.game; g.combo = 137; g['lastTapAt'] = Date.now() + 5000; window.__app.hud.setCombo(137); });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/${lang}/02-combat.png` });
  // 3: Rei Esqueleto furioso
  await page.evaluate(() => { const a = window.__app; const g = a.game; g['_dmg'] = g['damage']; g['damage'] = () => {}; g['_weak'] = g.weakSpotHit; g.weakSpotHit = () => null; g.state.stage = 50; a.scene.setZone(0); g.spawnEnemy(); });
  await page.waitForTimeout(2600);
  await page.evaluate(() => { const g = window.__app.game; g['enemyHp'] = g.enemyMaxHp.times(0.35); });
  await page.waitForTimeout(1300);
  await page.evaluate(() => document.querySelectorAll('.boss-intro,.banner,.toast').forEach((e) => e.remove()));
  for (let i = 0; i < 4; i++) { await page.touchscreen.tap(250, 270); await page.waitForTimeout(60); }
  await page.screenshot({ path: `${OUT}/${lang}/03-boss.png` });
  await page.evaluate(() => { const g = window.__app.game; g['damage'] = g['_dmg']; g.weakSpotHit = g['_weak']; });
  // 4: Golem no gelo + Pontos Fracos
  await page.evaluate(() => { const g = window.__app.game; g.state.bladeLevel = 142; g.state.guild = [86, 74, 61, 52, 40, 25, 10, 0]; });
  await page.evaluate(() => { const a = window.__app; const g = a.game; g.state.stage = 163; a.scene.setZone(3); g.spawnEnemy(); g.monster = { type: 'golem', affix: 'giant' }; a.scene.spawnEnemy(false, g.monster); });
  await page.waitForTimeout(1500);
  for (let i = 0; i < 8; i++) { await page.touchscreen.tap(250, 270); await page.waitForTimeout(50); }
  await page.screenshot({ path: `${OUT}/${lang}/04-creatures.png` });
  // 5..8: abas
  const tab = async (n, file, scroll = 0) => {
    await page.click(`.tab:nth-child(${n})`);
    await page.waitForTimeout(500);
    if (scroll) { await page.evaluate((y) => (document.querySelector('.tab-content').scrollTop = y), scroll); await page.waitForTimeout(300); }
    await page.evaluate(() => document.querySelectorAll('.toast,.banner').forEach((e) => e.remove()));
    await page.screenshot({ path: `${OUT}/${lang}/${file}.png` });
  };
  await page.evaluate(() => { const a = window.__app; const g = a.game; g.state.stage = 63; a.scene.setZone(1); g.spawnEnemy(); g.monster = { type: 'bat', affix: null }; a.scene.spawnEnemy(false, g.monster); });
  await tab(1, '05-relics', 260);
  await tab(2, '06-guild');
  await page.evaluate(() => { const a = window.__app; const g = a.game; g.state.stage = 123; a.scene.setZone(2); g.spawnEnemy(); g.monster = { type: 'imp', affix: 'golden' }; a.scene.spawnEnemy(false, g.monster); });
  await page.waitForTimeout(800);
  await tab(4, '07-journey');
  await tab(3, '08-rebirth');
  await ctx.close();
}
console.log(errs.join('\n') || 'ok');
await browser.close();
