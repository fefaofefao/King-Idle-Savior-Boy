# DECISIONS — King Idle Savior Boy

Registro das decisões técnicas e de design, com uma linha de justificativa cada.

## Stack e arquitetura
- **Vite + TypeScript strict, UI em HTML/CSS puro** (helper `h()` em `src/ui/dom.ts`) — a UI é pequena; um framework só aumentaria o bundle.
- **Lógica do jogo isolada em `src/core/`** (sem DOM nem Three.js) — permite testar tudo com Vitest e reaproveitar a mesma classe `Game` no simulador.
- **Estado único serializável (`GameState`)** com `schemaVersion` e migrações em `src/core/save.ts` — evita bugs de save ao evoluir o jogo.
- **break_infinity.js** para números grandes — mais rápido que break_eternity e suficiente para a escala do jogo (até ~1e9e15).
- **Save em `@capacitor/preferences`** (localStorage no navegador) com backup do save anterior — simples e funciona offline.
- **Capacitor 8** (última estável no momento): o template já vem com `minSdk 24` e `targetSdk 36`. A Play exige API 35 para apps novos desde 31/08/2025 e deve passar a exigir 36 em 2026; 36 atende os dois. Confirme no Play Console antes de publicar.

## Monstros, variações e Pontos Fracos (retenção sem quebrar o idle)
- **7 tipos no Bestiário:** Lacaio, Ladino e Mago Esqueleto; Cavaleiro Caído (`knight.glb` em tons sombrios, a partir da fase 21) e Bruxa Sombria (`mage.glb` sombrio, fase 31+); chefes General Esqueleto (fases 10–40 de cada zona) e **Rei Esqueleto** (a cada 50 fases), este com o sprite em pixel art enviado pelo dono, desenhado como billboard com animação procedural (`SpriteActor`). Os multiplicadores de vida/ouro dos tipos têm média ≈ 1 (há teste), então não mudam o ritmo.
- **Variações raras:** *Dourado* (3,5%: 60% da vida, ouro ×10, foge em 7 s), *Blindado* (8%: 40% da vida vira armadura, que leva só metade do dano de toque; ouro ×1,6) e *Gigante* (6%: maior, vida ×2, ouro ×2,6). Elas criam momentos de decisão ("mata o dourado antes que fuja!") sem exigir nada.
- **Ponto Fraco:** um alvo brilhante surge no corpo do inimigo a cada 3,5–6,5 s, por 1,7 s. Tocá-lo causa crítico ×8 e atravessa armadura. Recompensa atenção e precisão (não velocidade de toque, então não favorece autoclicker) e fica limitado no tempo, sem quebrar o balanceamento. Na primeira vez dura mais e mostra uma dica.
- **Bestiário (retenção de longo prazo):** abates por tipo, com estrelas a 10/100/1000/10000; cada estrela dá +2% de ouro permanente (sobrevive ao Renascer). Novas missões diárias e conquistas: Pontos Fracos, Dourados e estrelas.
- Save v4 (Bestiário). O ouro agora é fracionário: antes era arredondado para cima a cada abate, o que inflava ~11× o ouro das primeiras fases e era a causa do "começo rápido demais".

## Animações e feedback
- **Golpes encadeados:** tocar durante um golpe enfileira o próximo (mais rápido, como combo) em vez de reiniciar o movimento no meio, que causava "pulos". O dano de cada toque continua instantâneo.
- **Números de dano mesclados:** toques normais em até 220 ms somam no mesmo número (com um "pop"); críticos e Pontos Fracos têm número próprio.
- O squash do inimigo e as partículas têm limite de frequência; a armadura solta faíscas metálicas e tem som próprio.
- **Barra de vida refeita:** número centralizado dentro da barra, faixa de armadura listrada, "dano recente" em faixa clara e barra de fuga do Dourado.
- **UX:** os botões de compra mostram o ganho ("+11 DPS", "⚔+2"); uma bolinha verde nas abas Herói/Guilda indica que há algo para comprar; cartão de entrada do chefe com retrato; o ouro é exibido arredondado para baixo.

## Jornada do Rei (missões principais)
- **36 missões em 5 capítulos**, um por zona: Floresta Sombria, Cavernas de Cristal, Deserto do Renascer, Picos Gelados e Vulcão do Rei Esqueleto. Cada capítulo abre com um modal de história (3 idiomas), e o botão 📖 na aba Missões relê a história. Depois da cadeia vêm missões infinitas ("alcance a fase X", a cada 25 fases) que dão cristais.
- **O progresso é lido do estado** (maior fase, toques, nível da Lâmina, membros...), não acumulado. É robusto a saves antigos e ao Renascer. A migração v2 → v3 começa a jornada do zero para quem já jogava, e as missões já cumpridas aparecem prontas para coletar.
- **O tutorial está embutido nas primeiras missões** (tocar, derrotar, Lâmina, contratar o Escudeiro). Elas pagam ouro fixo suficiente para a próxima compra, e uma mãozinha "Toque no inimigo" aparece até os 5 primeiros toques.
- **Rastreador no HUD** abaixo da fase: mostra o objetivo e a barra de progresso. Fica verde e pulsando quando a missão está pronta; tocar nele coleta. Se ainda não estiver pronta, abre a aba Missões.
- A cadeia foi validada no simulador: o jogador casual completa 35 das 36 missões em ~3 dias.

## APK de teste
- **Workflow `android-apk.yml`:** gera um APK debug a cada push (anúncios de teste do Google, sem keystore). Baixe em Actions → Artifacts. Guia: `TESTE_APK.md`.
- **Painel de testes** (`FEATURES.TEST_TOOLS`, ligado só com `VITE_TEST_BUILD=1`, que é o caso do APK de teste): tocar 5× na versão, no Menu. Oferece +ouro, +cristais, +10 fases, simular 8 h offline, zerar recargas e apagar o progresso. Não existe no build de release.
- **Edge-to-edge (Android 15+):** `SystemBars.insetsHandling = 'css'` no capacitor.config. O CSS usa `--safe-area-inset-*` injetado pelo Capacitor, com `env()` como reserva.
- **`setup-android`:** a lista de pacotes é explícita, porque o pacote padrão `tools` não existe mais no sdkmanager atual.

## Ícone
- **Ícone renderizado do `knight.glb`** com espada e escudo, do peito para cima, sobre fundo em gradiente azul. `scripts/render-icon.mjs` abre `tools/render-icon.html` no Chromium headless (Vite + Three.js) e grava `assets/knight-render.png`; `npm run icons` gera o ícone adaptativo, o splash e `public/icon.png`, que também aparece na tela inicial.

## Nome e tela inicial
- **Nome do jogo: "King Idle Savior Boy"** (pedido do dono), igual nos 3 idiomas e definido numa única constante (`GAME_TITLE`). O Package ID `br.com.fernando.idleknight` foi mantido, conforme a especificação.
- **Tela inicial** (`src/ui/Intro.ts`): aparece a cada abertura. Tem um cenário em SVG ao entardecer (castelo, montanhas, raios girando, faíscas), o logo com coroa e o botão Jogar. O carregamento dos modelos aparece no próprio botão ("Carregando… 45%"), e a escolha dos 3 idiomas fica na mesma tela, em destaque na primeira abertura.

## Idiomas
- **3 idiomas: pt-BR, en e es** (pedido do dono, ampliando os 2 da especificação). Arquivos em `src/i18n/locales/`; o TypeScript obriga os três a terem as mesmas chaves e um teste confere placeholders.
- **Tela de escolha de idioma na primeira abertura**, com o idioma do aparelho pré-selecionado; depois é alterável no Menu. A escolha fica em `settings.lang` / `settings.langChosen`.
- **Migração v1 → v2** do save marca `langChosen = true` para quem já jogava (não mostra a tela de novo).
- **Bandeiras em SVG** em vez de emoji — emoji de bandeira não aparece em todos os aparelhos.
- O nome do app no Android é "King Idle Savior Boy" em todos os idiomas.

## Balanceamento (rodar `npm run sim`)
- **Rebalanceamento do começo (feedback do APK de teste: "começo rápido demais").** O jogador de referência agora toca a 5 toques/s e acerta ~70% dos Pontos Fracos. Há uma meta nova: um inimigo das fases 1–10 deve durar de 1,5 a 4 s (antes durava 0,6 s), e a fase 10 sai em 4–7 min. Ajustes: **HP base 10 → 55**, **ouro/HP 0,009 → 0,0045**, **DPS da guilda ×2,2** (o progresso do jogador casual depende mais da guilda, que também rende offline) e ouro fracionário.
- **O simulador segue a Jornada do Rei** como um jogador real: compra o que a missão pede, guarda ouro para contratar o membro pedido, coleta as missões e abre o Baú do Mensageiro a cada ~4 min. Com isso o ritmo ficou mais rápido que na versão sem missões, e as constantes foram reajustadas.
- **Ouro por HP: 0,09 → 0,0045** (com HP base 55; veja o rebalanceamento do começo acima). O formato `ouro = HP × k` foi mantido; só a constante mudou.
- **Cristais: `floor(((faseMax − 30) / 3,5)^1,55)`.** A fase 40 dá 5 cristais e a fase 50 dá 14 (meta de 5 a 15 no 1º Renascer). Renascimentos mais tardios rendem mais (fase 70 = 43, fase 100 = 103), o que leva o jogador casual à fase ~100 no 3º dia.
- **Loja de Cristais:** dano/ouro custam `1 × 1,3^nível`; crítico, tempo do chefe, offline e recarga têm nível máximo (20/15/16/10) e custo mais íngreme.
- **Toque Arcano:** desbloqueia na fase 20 e custa `25 000 × 12^nível`.
- **Jogador de referência:** 3 toques/s no modo ativo. No casual, 4 sessões de 10 min por dia a 2 toques/s, renascendo quando o ganho de cristais iguala tudo o que já obteve.
- **Métrica "sem algo para comprar"** mede o tempo sem NENHUM upgrade acessível.
- `goldStageDecay` (ouro crescendo mais devagar que o HP) existe, mas fica em 1 (desligado).

### Resultado da simulação (constantes atuais)
```

=== Jogador ATIVO (5 toques/s, 120 min) ===
  fase  10: 4:32
  fase  20: 13:53
  fase  30: 24:10
  fase  40: 41:50
  fase  50: 1h 16m
  fase  60: —
  fase  80: —
  fase 100: —
  Renascer disponível em: 41:50
  final: fase 50, DPS 49.5K, toque 851, lâmina 80, guilda [58,38,22,2,0,0,0,0], arcano 1
  cristais se renascer agora: 14
  maior intervalo sem nada para comprar (primeiras 2 h): 1:16
  tempo médio por inimigo — fases 1-5: 2.3s | fases 6-10: 2.5s | fases 11-20: 5.2s | fases 21-40: 4.7s

=== Jogador CASUAL (3 dias, 4×10 min/dia, 2 toques/s) ===
  dia 1 sessão 4: Renascer na fase 46 (+10 cristais)
  fim do dia 1: fase máx. da run 8, recorde 46, cristais 11, renascimentos 1
  dia 2 sessão 4: Renascer na fase 58 (+25 cristais)
  fim do dia 2: fase máx. da run 25, recorde 58, cristais 12, renascimentos 2
  dia 3 sessão 3: Renascer na fase 86 (+73 cristais)
  fim do dia 3: fase máx. da run 30, recorde 86, cristais 35, renascimentos 3

=== Metas ===
  [OK ] Inimigo das fases 1–10 dura 1,5–4 s: 2.4s
  [OK ] Fase 10 em 4–7 min: 4:32
  [OK ] Renascer (fase 40) em 35–60 min: 41:50
  [OK ] Cristais no 1º Renascer (fase 40–50): 5–14
  [OK ] Fase ~100 (80+) no 3º dia casual: 86
  [OK ] Nunca > ~5 min sem nada para comprar (2 h): 1:16
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
- **Modelos KayKit** em `public/models/` conforme o `ASSETS.md`. Os bonecos primitivos (`src/scene/Fallback.ts`) continuam como fallback se algum GLB falhar.
- **Caminhos, ossos e clipes em `src/config/visual.ts`.** Os clipes são achados por lista de aliases (`Idle_A`/`Idle_B`, `Hit_A`/`Hit_B`, `Death_A`/`Death_B`, `Spawn_Ground`/`Spawn_Air`, `Throw`, `Interact`).
- **Animações (ASSETS.md):** a Maga usa `Idle_B` e lança o projétil a partir de `handslot.r` aos 40% do `Throw`. Os inimigos entram com `Spawn_Ground` (o chefe com `Spawn_Air`), alternam `Hit_A`/`Hit_B` com crossfade de 0,1 s (no máximo um a cada 0,28 s) e morrem com `Death_A` ou `Death_B` sorteado. O Cavaleiro toca `Interact` ao derrotar um chefe e ao atingir um marco de nível.
- **Ataque do Cavaleiro (`KnightAttack.ts`):** como não há clipe de ataque, ele avança 0,15 s e volta 0,15 s, com rotação aditiva no `upperarm.r` (ergue no eixo Y e desce apontando para o inimigo no eixo X, eixos conferidos por render) e um leve giro no `lowerarm.r`. Toques rápidos reiniciam o golpe. Clipes de `rig_medium_combat*.glb` são detectados automaticamente.
- **Armas dos esqueletos:** o pack não traz armas próprias para eles, então reutilizam as dos heróis. Minion e Rogue usam `sword_1handed`, o Mage usa `staff` e o Warrior (chefe) usa `sword_1handed` + `shield_badge_color`. Cada arquivo é carregado uma vez só.
- **Companheira = "Maga":** o `mage.glb` tem aparência feminina (cabelo longo, chapéu de bruxa).
- `rig_medium_movement.glb` veio no zip, mas não é usado (ASSETS.md marca como opcional).
- **Materiais clonados por instância** — necessário para o tint por zona e o flash de impacto sem afetar outros inimigos.
- **Sem shadow maps**: sombra circular falsa (textura radial) sob cada personagem.
- **DRACO + meshopt** registrados no GLTFLoader; o decoder DRACO é empacotado pelo próprio three/Vite (sem CDN).

## Layout responsivo
- **Câmera se ajusta à faixa livre** entre o HUD de cima (fase + rastreador + nome/HP do inimigo) e os botões de habilidade. A distância é calculada para caber o Cavaleiro, a Maga e o chefe ×1,6 (`CAMERA.fitHeight`/`fitWidth`), e `setViewOffset` centraliza a luta nessa faixa. O Hud informa a faixa a cada atualização (`GameScene.setInsets`). Testado em 360×640, 360×780 e 412×915.
- **Telas baixas (≤ 720 px):** painel em 40vh e HUD compacto.
- **Avisos (toasts):** no topo, no máximo 2 ao mesmo tempo, para nunca cobrir a luta.
- **Recompensa da Jornada:** piso de 20 kills da fase atual, para nunca parecer "nada".

## Desempenho
- `pixelRatio` até 2; cai para 1,5 se o FPS médio ficar abaixo de 42 com o jogo em uso.
- 60 fps durante a interação e 30 fps após 20 s sem toque (o `rAF` continua, só o render é pulado).
- Render e timers param em segundo plano; o progresso desse período vem do sistema offline.
- Números de dano limitados a 40 simultâneos.

## Anúncios
- **Rewarded por eventos, não pela Promise.** No Android, `showRewardVideoAd()` do `@capacitor-community/admob` só resolve quando a recompensa é ganha. Se o jogador fecha antes, a Promise fica pendente para sempre, o que travava o jogo (modais sem fechar, botões de anúncio mortos) e não dava a recompensa. Agora `AdMobAdService.showRewarded` escuta `Rewarded`/`Dismissed`/`FailedToShow` e SEMPRE termina quando o anúncio fecha, com tempo-limite de segurança. Coberto por `tests/admob.test.ts`.
- **`AdMob.initialize()` antes do UMP**, como na documentação do plugin.
- **Confirmação visível:** "Ouro ×2 ativo: 5:00" ao ganhar o buff; a recompensa da Jornada aparece em destaque (+ouro/+cristais).
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
