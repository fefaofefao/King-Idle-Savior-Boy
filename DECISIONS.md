# DECISIONS — Cavaleiro Ocioso / Idle Tap Knight

Registro das decisões técnicas e de design, com uma linha de justificativa cada.

## Stack e arquitetura
- **Vite + TypeScript strict, UI em HTML/CSS puro** (helper `h()` em `src/ui/dom.ts`) — a UI é pequena; um framework só aumentaria o bundle.
- **Lógica do jogo isolada em `src/core/`** (sem DOM nem Three.js) — permite testar tudo com Vitest e reaproveitar a mesma classe `Game` no simulador.
- **Estado único serializável (`GameState`)** com `schemaVersion` e migrações em `src/core/save.ts` — evita bugs de save ao evoluir o jogo.
- **break_infinity.js** para números grandes — mais rápido que break_eternity e suficiente para a escala do jogo (até ~1e9e15).
- **Save em `@capacitor/preferences`** (localStorage no navegador) com backup do save anterior — simples e funciona offline.
- **Capacitor 8** (última estável no momento): o template já vem com `minSdk 24` e `targetSdk 36`. A Play exige API 35 para apps novos desde 31/08/2025 e deve passar a exigir 36 em 2026; 36 atende os dois. Confirme no Play Console antes de publicar.

## Idiomas
- **3 idiomas: pt-BR, en e es** (pedido do dono, ampliando os 2 da especificação). Arquivos em `src/i18n/locales/`; o TypeScript obriga os três a terem as mesmas chaves e um teste confere placeholders.
- **Tela de escolha de idioma na primeira abertura**, com o idioma do aparelho pré-selecionado; depois é alterável no Menu. A escolha fica em `settings.lang` / `settings.langChosen`.
- **Migração v1 → v2** do save marca `langChosen = true` para quem já jogava (não mostra a tela de novo).
- **Bandeiras em SVG** em vez de emoji — emoji de bandeira não aparece em todos os aparelhos.
- O nome do app também é traduzido no Android (`values-pt-rBR`, `values-es`): "Cavaleiro Ocioso" / "Idle Tap Knight" / "Caballero Ocioso".

## Balanceamento (rodar `npm run sim`)
- **Ouro por HP: 0,09 → 0,017.** Com 0,09 a fase 40 chegava em ~10 min (meta: 35–60). O formato da fórmula (`ouro = HP × k`) foi mantido; só a constante mudou.
- **`goldStageDecay`** (ouro crescendo mais devagar que o HP) foi testado e descartado; fica em 1 (desligado) como ponto de ajuste futuro.
- **Cristais: divisor 5 → 2,5** (`floor(((faseMax − 30) / 2,5)^1,3)`) — com 5, a fase 40 dava só 2 cristais; agora o 1º Renascer (fase 40–50) dá 6–14.
- **Loja de Cristais:** dano/ouro custam `1 × 1,3^nível`; crítico, tempo do chefe, offline e recarga têm nível máximo (20/15/16/10) e custo mais íngreme.
- **Toque Arcano:** desbloqueia na fase 20, custa `25 000 × 12^nível` (custo alto, como pedido).
- **Simulação de referência:** jogador ativo a 3 toques/s (5 toques/s sustentados por 40 min não é realista). O simulador aceita `--tps=N` e `--set=caminho=valor` para experimentos.
- **Métrica "sem algo para comprar"** mede o tempo sem NENHUM upgrade acessível, não o tempo entre compras (o simulador às vezes espera de propósito pelo melhor upgrade).

### Resultado da simulação (constantes atuais)
```

=== Jogador ATIVO (3 toques/s, 120 min) ===
  fase  10: 3:12
  fase  20: 8:33
  fase  30: 23:45
  fase  40: 36:16
  fase  50: 1h 16m
  fase  60: —
  fase  80: —
  fase 100: —
  Renascer disponível em: 36:16
  final: fase 50, DPS 7.08K, toque 744, lâmina 61, guilda [40,32,7,0,0,0,0,0], arcano 0
  cristais se renascer agora: 14
  maior intervalo sem nada para comprar (primeiras 2 h): 1:33

=== Jogador CASUAL (3 dias, 4×10 min/dia, 2 toques/s) ===
  fim do dia 1: fase máx. da run 59, recorde 59, cristais 0, renascimentos 0
  dia 2 sessão 2: Renascer na fase 69 (+35 cristais)
  dia 2 sessão 4: Renascer na fase 67 (+33 cristais)
  fim do dia 2: fase máx. da run 48, recorde 69, cristais 33, renascimentos 2
  dia 3 sessão 2: Renascer na fase 84 (+54 cristais)
  dia 3 sessão 4: Renascer na fase 96 (+70 cristais)
  fim do dia 3: fase máx. da run 62, recorde 96, cristais 84, renascimentos 4

=== Metas ===
  [OK ] Fase 10 em 2–4 min: 3:12
  [OK ] Renascer (fase 40) em 35–60 min: 36:16
  [OK ] Cristais no 1º Renascer (fase 40–50): 6–14
  [OK ] Fase ~100 no 3º dia casual: 96
  [OK ] Nunca > ~5 min sem nada para comprar (2 h): 1:33
```

## Regras de jogo interpretadas
- **Ganhos offline = renda/s × segundos × 0,5**, em que renda/s é o ouro/s que o DPS atual geraria na fase atual. A fórmula literal `DPS × s × 0,5` daria ouro por *dano* (~30× mais que jogando ativo).
- Buffs temporários (anúncio ×2, Chuva de Ouro) **não** multiplicam o offline; o ×2 permanente do "Remover anúncios" multiplica.
- **Mago/Maga:** 20% do DPS da guilda em pacotes a cada 1,5 s, com dano aplicado quando o projétil chega (0,35 s). O DPS da guilda continua contínuo. O texto usa "Maga"; **confirme no `ASSETS.md`** se o modelo `mage.glb` tem aparência feminina e ajuste `guild.mage*` nos 3 idiomas se não tiver.
- **Fase de chefe = só o chefe** (sem os 10 inimigos). Ao falhar, volta 1 fase e fica farmando; "Enfrentar chefe" tenta de novo.
- **+15 s contra o chefe:** o tempo pausa e o jogo oferece o anúncio uma vez por chefe. Se o anúncio falhar, o chefe é considerado perdido (sem recompensa).
- **Habilidades e Toque Arcano desbloqueiam pela maior fase da conta** (`stats.highestStage`), para não sumirem depois do Renascer. O Mago usa a maior fase da run.
- **Golpe Furioso** causa `max(30 s de DPS, 10 toques)`, para não ser inútil antes de contratar a guilda.
- **Recompensas** de baú, missões e recompensa diária são medidas em "segundos de renda", com piso em N kills da fase atual (ex.: baú = 60 s de renda ou 8 kills).
- **Missões diárias:** 3 por dia, de tipos diferentes, sorteadas de forma determinística (seed = dia + data do 1º jogo). Nenhuma envolve anúncio.
- **Recompensa diária:** ciclo de 7 dias; perder um dia não zera (o índice só avança quando o jogador coleta).
- **Ouro do inimigo arredondado para cima** — senão a fase 1 daria 0 de ouro.

## 3D
- **Modelos KayKit não estavam na sessão** (o `assets_kaykit.zip` não foi enviado ao repositório). O jogo foi feito para funcionar sem eles: `Assets.ts` testa `models/characters/knight.glb` e, se não achar, usa **bonecos primitivos low-poly** (`src/scene/Fallback.ts`) com ossos falsos (`handslot.r/l`, `upperarm.r`) e animações procedurais.
- **Caminhos, ossos e nomes de clipes ficam todos em `src/config/visual.ts`.** Depois de extrair o zip, ajuste-os conforme o `ASSETS.md` (ele prevalece). Os clipes são achados por lista de aliases (`Idle_A`, `Hit_A`, `Death_A`, `Spawn_Ground`, `Throw`...) e por busca parcial.
- **Materiais clonados por instância** — necessário para o tint por zona e o flash de impacto sem afetar outros inimigos.
- **Sem shadow maps**: sombra circular falsa (textura radial) sob cada personagem.
- **DRACO + meshopt** registrados no GLTFLoader; o decoder DRACO é empacotado pelo próprio three/Vite (sem CDN).

## Desempenho
- `pixelRatio` até 2; cai para 1,5 se o FPS médio ficar abaixo de 42 com o jogo em uso.
- 60 fps durante a interação e 30 fps após 20 s sem toque (o `rAF` continua, só o render é pulado).
- Render e timers param em segundo plano; o progresso desse período vem do sistema offline.
- Números de dano limitados a 40 simultâneos.

## Anúncios
- `AdService` com `MockAdService` (navegador; `?adfail=1` na URL simula falha) e `AdMobAdService` (Android).
- **Sem IDs reais no código:** padrão = IDs de teste oficiais do Google; os reais entram como `VITE_ADMOB_*` (build web) e `ADMOB_APP_ID` (Gradle), vindos dos GitHub Secrets.
- UMP antes de `initialize`; `tagForChildDirectedTreatment: false`, `maxAdContentRating: Teen`.
- Interstitial apenas após confirmar um Renascer, com mínimo de 3 min entre interstitials, nunca nos 10 primeiros minutos desde o 1º jogo e nunca até 60 s após um rewarded (`src/ads/AdPolicy.ts`, com testes).
- `ENABLE_BANNER = false` e `ENABLE_IAP = false` em `src/config/app.ts`.
- **IAP futuro:** usar **`@capgo/native-purchases`** (Play Billing 7+, mantido e compatível com Capacitor 8). Alternativa: RevenueCat (`@revenuecat/purchases-capacitor`) se quiser validação de recibo no servidor sem backend próprio. A interface `PurchaseService` já existe.

## Notificações
- Notificação local agendada ao ir para segundo plano, para o momento em que o baú offline enche; cancelada ao voltar. **Alarme inexato** (`allowWhileIdle: false`), para não exigir a permissão `SCHEDULE_EXACT_ALARM`, que a Play restringe.

## Build
- `versionCode` = número do run do workflow; `versionName` = tag sem o "v".
- A assinatura só é configurada se `ANDROID_KEYSTORE_PATH` existir; sem keystore o workflow avisa e gera um AAB não assinado.
- Não foi possível rodar o Gradle nesta sessão (o download do Android SDK foi bloqueado pela rede). O AAB é gerado no GitHub Actions.
