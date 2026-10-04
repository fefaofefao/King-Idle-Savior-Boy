# CLAUDE.md — Cavaleiro Ocioso / Idle Tap Knight

Clicker + RPG idle em retrato (portrait) para Android (Capacitor) que também roda no navegador.
Especificação original: GAME_SPEC v2 (no histórico da conversa/issue). Decisões: `DECISIONS.md`.

## Como rodar

```bash
npm install
npm run dev            # navegador em http://localhost:5173 (use o modo dispositivo do DevTools)
npm test               # Vitest (fórmulas, save/migração, offline, relógio, cristais, i18n, anúncios)
npm run build          # typecheck + build web em dist/
npm run sim            # simulador de balanceamento (metas de ritmo)
npm run sim -- --tps=5 --set=enemy.goldPerHp=0.02   # experimentos
npm run optimize-models   # (opcional) meshopt nos .glb de public/models
npm run icons          # regenera ícone adaptativo + splash a partir de assets/icon.svg
npm run android:sync   # build + cap sync android
npm run android:open   # abre no Android Studio
```

Depuração no navegador: `window.__app` (ex.: `__app.state.gold = __app.state.gold.plus(1e9)`).
`?adfail=1` na URL simula falha de anúncio.

## Modelos 3D (KayKit)

`assets_kaykit.zip` **ainda não foi adicionado** ao repositório. Para usar os modelos reais:
1. Extraia o zip na raiz (cria `public/models/...`, `licenses/` e `ASSETS.md`). Não versione o zip (`*.zip` está no .gitignore).
2. Leia o `ASSETS.md` e ajuste **apenas** `src/config/visual.ts` (`MODEL_PATHS`, `WEAPON_PATHS`, `HAND_BONES`, `ARM_BONES`, `CLIP_ALIASES`, alturas e posições).
3. Sem os modelos, o jogo usa bonecos primitivos (`src/scene/Fallback.ts`) e nunca trava.
O caminho com modelos reais foi validado com GLBs de teste (esqueleto com `handslot.r/l`, clipes `Idle_A`, `Hit_A`, `Death_A`, `Spawn_Ground`, `Throw`).

## Estrutura

```
src/
  config/      app.ts (APP_ID, flags), balance.ts (TODAS as constantes), visual.ts (modelos/câmera/zonas)
  core/        lógica pura e testável: state, formulas, game (classe Game), save, offline, retention, format, bignum
  i18n/        index.ts + locales/{pt-BR,en,es}.ts  ← 3 idiomas
  scene/       Three.js: GameScene, Assets (cache GLB + fallback), Actor, KnightAttack, Zones, Effects, Fallback
  ui/          Hud, Panel (abas), Modals, Floaters, Intro (escolha de idioma + loading), icons (SVG), dom
  ads/         AdService (interface), MockAdService, AdMobAdService (UMP), AdPolicy (regras do interstitial)
  audio/       Sfx (Web Audio procedural + música opcional)
  platform/    Capacitor: Preferences, App, Haptics, LocalNotifications, SplashScreen
  iap/         PurchaseService (estrutura desligada)
  App.ts       orquestra tudo; main.ts = entrada
scripts/       balance-sim.ts, optimize-models.sh, gen-icons.mjs
tests/         *.test.ts (Vitest)
android/       projeto Capacitor (minSdk 24, targetSdk 36, portrait, AdMob App ID via placeholder)
.github/workflows/  ci.yml (testes + build a cada push), android-release.yml (AAB assinado)
privacy-policy/ store-listing/ app-ads.txt SETUP_CONTAS.md CREDITS.md licenses/
```

## Convenções

- Constantes de jogo só em `src/config/balance.ts`; constantes visuais só em `src/config/visual.ts`.
- Todo texto visível passa por `t()`/`tk()`. Nova chave → adicionar nos **3** arquivos de `locales/` (o TypeScript e `tests/i18n.test.ts` acusam se faltar).
- Mudou o formato do save → incrementar `SCHEMA_VERSION` (state.ts) e escrever a migração em `MIGRATIONS` (save.ts) + teste.
- IDs reais do AdMob, senhas e keystore **nunca** no código: só GitHub Secrets (veja `SETUP_CONTAS.md`).
- Commits por fase, com testes passando.

## Estado das fases

| Fase | Estado |
|---|---|
| 1. Núcleo jogável no navegador | ✅ concluída (com bonecos primitivos no lugar dos GLB ausentes) |
| 2. Progressão completa + i18n + simulador | ✅ concluída: **3 idiomas (pt-BR/en/es) com escolha ao iniciar**; simulação no DECISIONS.md |
| 3. Visual e game feel | ✅ concluída: zonas, ataque procedural, projétil, partículas, números, áudio |
| 4. Android + AdMob | ✅ código pronto: Capacitor, AdService, UMP, frequência, voltar, safe areas, haptics, notificações, ícone/splash |
| 5. Build e publicação | ✅ workflows, optimize-models, SETUP_CONTAS, política de privacidade, textos da loja |
| 6. Revisão final | ✅ testes e build ok, revisão feita; pendências abaixo |

## Pendências (dependem do dono do projeto)

1. **Adicionar `assets_kaykit.zip`** e ajustar `src/config/visual.ts` conforme o `ASSETS.md` (ver acima). Conferir também se a companheira é "Maga" ou "Mago" (textos `guild.mage*`).
2. **Contas:** AdMob (app + rewarded + interstitial + UMP), keystore, GitHub Secrets, Play Console — passo a passo em `SETUP_CONTAS.md`.
3. **Primeiro AAB:** rodar o workflow "Android Release (AAB)". O Gradle não pôde rodar nesta sessão (download do Android SDK bloqueado), então o 1º build Android real acontece no GitHub Actions. Confira lá o tamanho do AAB (o workflow falha se passar de 40 MB; o build web tem ~2,5 MB).
4. **Teste em aparelho real:** desempenho (FPS/bateria), anúncios de teste, consentimento UMP, botão voltar, notificação do baú offline.
5. **Publicar a política de privacidade** (GitHub Pages), trocar o e-mail de contato e conferir `PRIVACY_URL` em `src/ui/Panel.ts`; publicar o `app-ads.txt` com o seu Publisher ID.
6. **Screenshots** da loja (lista em `store-listing/screenshots.md`).
7. **Futuro:** "Remover anúncios" com Play Billing (`ENABLE_IAP`, plugin sugerido no DECISIONS.md).
