# CLAUDE.md — King Idle Savior Boy

Clicker + RPG idle em retrato (portrait) para Android (Capacitor) que também roda no navegador.
Especificação: `GAME_SPEC.md` + `ASSETS.md`. Nome do jogo: **King Idle Savior Boy** (`GAME_TITLE` em `src/config/app.ts`). Decisões: `DECISIONS.md`.

## Como rodar

```bash
npm install
npm run dev            # navegador em http://localhost:5173 (use o modo dispositivo do DevTools)
npm test               # Vitest (fórmulas, save/migração, offline, relógio, cristais, i18n, anúncios, conteúdo)
npm run build          # typecheck + build web em dist/
npm run sim            # simulador de balanceamento (metas de ritmo)
npm run sim -- --tps=5 --set=enemy.goldPerHp=0.02   # experimentos
npm run sim -- --minutes=2700   # longo prazo: fase por hora e quando cada capítulo da Jornada termina
npm run optimize-models   # (opcional) meshopt nos .glb de public/models
node scripts/render-icon.mjs   # renderiza o knight.glb → assets/knight-render.png (precisa do Playwright)
npm run icons          # gera ícone adaptativo + splash + public/icon.png a partir do render (ou de assets/icon.svg)
npm run android:sync   # build + cap sync android
npm run android:open   # abre no Android Studio
```

Depuração no navegador: `window.__app` (ex.: `__app.state.gold = __app.state.gold.plus(1e9)`).
`?adfail=1` na URL simula falha de anúncio.
**APK de teste:** cada push gera um APK debug no GitHub Actions ("Android APK (teste)" → Artifacts). Nele, tocar 5× na versão (Menu) libera o painel de testes. Veja `TESTE_APK.md`.

## Modelos 3D (KayKit)

Os modelos de `assets_kaykit.zip` estão em `public/models/` (heroes/, enemies/, weapons/, animations/), as licenças em `licenses/` e as regras em `ASSETS.md`, que prevalece sobre o GAME_SPEC nesses assuntos.
Caminhos, ossos e clipes ficam só em `src/config/visual.ts`. Se um GLB falhar, o jogo usa bonecos primitivos (`src/scene/Fallback.ts`) e nunca trava.
Se for adicionado `public/models/animations/rig_medium_combat*.glb` (pack KayKit Character Animations), o ataque do Cavaleiro passa a usar o clipe real automaticamente (`OPTIONAL_ANIMATIONS`).

## Estrutura

```
src/
  config/      app.ts (APP_ID, flags), balance.ts (TODAS as constantes), visual.ts (modelos/câmera/zonas)
  core/        lógica pura e testável: state, formulas, game (classe Game), save, offline, retention, story (Jornada do Rei), format, bignum
  i18n/        index.ts + locales/{pt-BR,en,es}.ts  ← 3 idiomas
  scene/       Three.js: GameScene, Assets (cache GLB + fallback), Actor, CreatureActor (criaturas procedurais), SpriteActor (Rei), KnightAttack, Zones, Effects, Fallback
  ui/          Hud (com rastreador de missão), Panel (abas), Modals, Floaters, Intro (tela inicial), storyText, icons (SVG), dom
  ads/         AdService (interface), MockAdService, AdMobAdService (UMP), AdPolicy (regras do interstitial)
  audio/       Sfx (Web Audio procedural + música opcional)
  platform/    Capacitor: Preferences, App, Haptics, LocalNotifications, SplashScreen
  iap/         PurchaseService (estrutura desligada)
  App.ts       orquestra tudo; main.ts = entrada
scripts/       balance-sim.ts, optimize-models.sh, gen-icons.mjs, render-icon.mjs (+ tools/render-icon.*)
tests/         *.test.ts (Vitest)
android/       projeto Capacitor (minSdk 24, targetSdk 36, portrait, AdMob App ID via placeholder)
.github/workflows/  ci.yml (testes + build), android-apk.yml (APK de teste a cada push), android-release.yml (AAB assinado)
docs/ (GitHub Pages: privacidade + termos, pt/en/es)  store-listing/ (textos, notas, ícone, gráfico, screenshots)
scripts/store/ (gera screenshots e gráfico)  app-ads.txt  PUBLICAR.md  SETUP_CONTAS.md  CREDITS.md  licenses/
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
| 1. Núcleo jogável no navegador | ✅ concluída, com os modelos KayKit |
| 2. Progressão completa + i18n + simulador | ✅ concluída: **3 idiomas (pt-BR/en/es) com escolha ao iniciar**; simulação no DECISIONS.md |
| 3. Visual e game feel | ✅ concluída: zonas, ataque procedural, projétil, partículas, números, áudio |
| 4. Android + AdMob | ✅ código pronto: Capacitor, AdService, UMP, frequência, voltar, safe areas, haptics, notificações, ícone/splash |
| 5. Build e publicação | ✅ workflows, optimize-models, SETUP_CONTAS, política de privacidade, textos da loja |
| 6. Revisão final | ✅ testes e build ok, revisão feita; pendências abaixo |
| Extra: Jornada do Rei | ✅ 71 missões em 10 capítulos + infinitas, tutorial, rastreador no HUD, história por capítulo |
| Extra: Versão final | ✅ criaturas procedurais, relíquias, visuais, combo, fim de jogo sem platô, passada de UX (DECISIONS.md) |
| Extra: v1.1 | ✅ Árvore de Talentos (3 ramos, 15 talentos) + Conjuntos de relíquias; rebalanceado (DECISIONS.md) |
| Extra: APK de teste | ✅ gerado no GitHub Actions a cada push, com painel de testes |

## Pendências (dependem do dono do projeto)

Lista completa e em ordem: **`PUBLICAR.md`**.


1. **Contas:** AdMob (app + rewarded + interstitial + UMP), keystore, GitHub Secrets, Play Console — passo a passo em `SETUP_CONTAS.md`.
2. **Testar o APK** no celular (`TESTE_APK.md`). O APK debug já compila no GitHub Actions (~13 MB). Para a Play, rodar "Android Release (AAB)" depois de cadastrar a keystore.
3. **Teste em aparelho real:** desempenho (FPS/bateria), anúncios de teste, consentimento UMP, botão voltar, notificação do baú offline.
4. **Ativar o GitHub Pages** (`main` / `/docs`), trocar o e-mail de contato em `docs/` e conferir `SITE_URL` em `src/ui/Panel.ts`; publicar o `app-ads.txt` com o seu Publisher ID.
5. Screenshots e gráficos já gerados em `store-listing/` (refazer com `scripts/store/` se o visual mudar).
6. **Futuro:** "Remover anúncios" com Play Billing (`ENABLE_IAP`, plugin sugerido no DECISIONS.md).
