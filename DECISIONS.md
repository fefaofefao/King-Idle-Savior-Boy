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

## Rei Esqueleto (sprites do dono)
- **Pose parada** `south.png` (48×48), **soco** Cross_Punch (6 frames 64×64, convertidos num sprite sheet) e **versão dourada** (`golden/`). Como a animação de soco só existe na direção "south", o Rei fica de frente. Os pés foram alinhados pelas medidas reais dos PNGs (2 px e 8 px da borda) e a escala por pixel é a mesma nas duas poses.
- **Ataque visual:** o Rei soca a cada 2,6 s (1,5 s furioso); no frame de impacto o Cavaleiro recua. É só visual: o jogo não tem dano contra o jogador, então o balanceamento não muda.
- **Fase 2:** abaixo de 40% de vida o Rei vira dourado ("O Rei está FURIOSO!") e soca mais rápido.
- `scripts/gif-to-sheet.mjs` converte um GIF animado em sprite sheet, caso venham novas animações.

## Segurar para atacar
- Segurar o dedo no palco ataca sozinho a 5 toques/s (após 0,35 s), o mesmo ritmo do jogador de referência do balanceamento, para não cansar a mão. Tocar manualmente ainda pode ser mais rápido. Soltar em qualquer lugar (inclusive sobre um modal) para o ataque.

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
**Versão atual (feedback do APK 8 do dono):** "cristais quebrando o jogo", "primeiro monstro com 10 de vida e 1 de ouro", "guilda forte demais", "10 min de jogo → 1º reset" e "pulando 10 min a guilda ainda matava, então não compensa resetar".

- **Começo:** HP base **10**, ouro por HP **0,1** → o primeiro monstro tem 10 de vida e dá **1 de ouro** (10 toques ≈ 2 s).
- **Parede para o Renascer:** HP cresce **×1,26 por fase** e o ouro cresce mais devagar (**goldStageDecay 0,95** → ×1,197 por fase). Como as compras rendem cada vez menos em relação à vida dos monstros, por volta da fase 40 (o chefe) o jogador trava. No simulador, **só com a guilda o progresso a partir da fase 30 é 0 fases em 10 min**, que era exatamente o problema relatado.
- **Guilda:** voltou aos valores da especificação (Escudeiro 5 DPS etc.). No 1º Renascer o DPS da guilda é ~0,55× o dos toques (antes era 12×).
- **Renascer:** liberado na **fase 30 (~8–9 min)**; a parede vem por volta de **14–15 min**. Cristais = `floor(((faseMax − 20) / 2,5)^1,4)` → fase 30 = 3, fase 40 = 18, fase 60 = 48.
- **Cristais menos fortes:** cada cristal guardado vale **+10%** de dano. Na loja, Dano custa `2 × 1,5^nível` e dá **+15%/nível** (antes +25% por 1 cristal), Ouro +10%/nível. As **conquistas do começo e as missões do tutorial agora dão ouro**; cristais vêm do Renascer e de marcos maiores (fase 50+, 10 mil toques, 1º Renascer...). O 7º dia da recompensa diária passou de 5 para 2 cristais.
- **Tutorial modesto:** as 4 primeiras missões juntas dão menos de 50 de ouro (antes ~120 em 13 s, que comprava Lâmina 4 + 2 Escudeiros na hora).
- **O Renascer compensa:** a run 2 passa a run 1 em +12 a +20 fases (stage 40 → 60) em ~3 de cada 4 simulações; na outra, a run 3 passa. Depois, cada Renascer rende algumas fases a mais (progressão idle clássica, sem explosão).
- **Jogador de referência:** 5 toques/s, ~70% dos Pontos Fracos, compra gananciosa, segue a Jornada, renasce quando fica 150 s sem fase nova e só compra Dano na loja quando isso aumenta o dano total (guardar cristal vale +10%).
- O jogador casual de 3 dias continua disponível (`npm run sim -- --casual`), mas a meta de ritmo agora é a do dono (reset em ~10 min).

### Resultado da simulação (constantes atuais)
```

=== Jogador ATIVO com Renascer (5 toques/s, 60 min) ===
  run 1: 0s → 17:09 (17:09), fase máx. 40, +18 cristais
  run 2: 17:09 → 48:46 (31:37), fase máx. 60, +48 cristais
  run 3: 48:46 → 1h 00m (11:15), fase máx. 52
  fase 10 em 2:52; Renascer disponível em 8:38
  DPS guilda / DPS de toque no 1º Renascer: 0.55
  parede: guilda sozinha 10 min → +0 fases; jogando ativo 10 min sem renascer → +14 fases

=== Jogador ATIVO (5 toques/s, 10 min) ===
  fase  10: 2:39
  fase  20: 5:13
  fase  30: 9:03
  fase  40: —
  fase  50: —
  fase  60: —
  fase  80: —
  fase 100: —
  Renascer disponível em: 9:03
  final: fase 33, DPS 4.20K, toque 312, lâmina 64, guilda [38,21,5,0,0,0,0,0], arcano 0
  cristais se renascer agora: 10
  maior intervalo sem nada para comprar (primeiras 2 h): 10s
  tempo médio por inimigo — fases 1-5: 1.2s | fases 6-10: 1.1s | fases 11-20: 1.0s | fases 21-40: 1.8s

=== Metas ===
  [OK ] Inimigo das fases 1–10 dura 1–4 s (o 1º: 10 toques ≈ 2 s): 1.2s
  [OK ] Fase 10 em 1,5–4 min: 2:52
  [OK ] 1º Renascer liberado em 5–11 min: 8:38
  [OK ] Parede (trava sem renascer) por volta de 10–15 min: 14.6 min
  [OK ] Guilda não domina no 1º Renascer (DPS guilda ≤ 2× toques): 0.55
  [OK ] Parede: só com a guilda, ≤ 2 fases em 10 min: +0
  [OK ] Parede: ativo sem renascer, a partir da liberação (fase 30), ≤ 15 fases em 10 min (trava no chefe 40): +14
  [OK ] Cristais no 1º Renascer: 5–20: 18
  [OK ] Renascer compensa: run 2 passa a run 1 em ≥ 3 fases: +20
  [OK ] Nunca > ~5 min sem nada para comprar: 10s
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
- `initialize` antes do UMP; `tagForChildDirectedTreatment: false`, `maxAdContentRating: ParentalGuidance` (PG). Anúncios não personalizados (`npa: true`) para todos (ECA Digital). Falha do UMP usa o consentimento anterior guardado; sem ele, sem anúncios.
- Notificação opt-in: a permissão só é pedida no Menu ou na 1ª vez que o baú offline enche (com explicação).
- Interstitial apenas após confirmar um Renascer, com mínimo de 3 min entre interstitials, nunca nos 10 primeiros minutos desde o 1º jogo e nunca até 60 s após um rewarded (`src/ads/AdPolicy.ts`, com testes).
- `ENABLE_BANNER = false` e `ENABLE_IAP = false` em `src/config/app.ts`.
- **IAP futuro:** usar **`@capgo/native-purchases`** (Play Billing 7+, mantido e compatível com Capacitor 8). Alternativa: RevenueCat (`@revenuecat/purchases-capacitor`) se quiser validação de recibo no servidor sem backend próprio. A interface `PurchaseService` já existe.

## Notificações
- Notificação local agendada ao ir para segundo plano, para o momento em que o baú offline enche; cancelada ao voltar. **Alarme inexato** (`allowWhileIdle: false`), para não exigir a permissão `SCHEDULE_EXACT_ALARM`, que a Play restringe.

## Build
- `versionCode` = número do run do workflow; `versionName` = tag sem o "v".
- A assinatura só é configurada se `ANDROID_KEYSTORE_PATH` existir; sem keystore o workflow avisa e gera um AAB não assinado.
- Não foi possível rodar o Gradle nesta sessão (o download do Android SDK foi bloqueado pela rede). O AAB é gerado no GitHub Actions.

## Versão final: conteúdo de longo prazo e UX
- **Fim de jogo sem platô:** a partir da fase 60 os cristais do Renascer crescem ×1,06 por fase (`prestige.lateGrowth`). Antes, a vida dos monstros crescia exponencialmente e os cristais não, e o jogo empacava na fase ~140 depois de ~25 h. Agora (simulação ativa, `npm run sim -- --minutes=2700`): fase ~120 em 4 h, ~160 em 10 h, ~186 em 1 dia, ~199 em 44 h.
- **Jornada em 10 capítulos (71 missões) + infinitas** (a cada 5 fases depois da 200). Conclusão simulada: cap. 3 em 35 min, cap. 5 em 2 h 40, cap. 6 em 3 h 50, cap. 7 em 5 h 40, cap. 8 em 10 h, cap. 9 em 22 h, cap. 10 em 45 h de jogo ativo (bem mais em dias reais, com sessões curtas).
- **Novos tipos de missão:** relíquias, níveis de relíquia, estrelas do Bestiário, Dourados, Pontos Fracos, visuais e combo.
- **Criaturas procedurais** (`src/scene/CreatureActor.ts`): Geleca, Cogumelo, Morcego, Golem e Diabrete, feitas de formas simples (sem GLB), cada uma com idle próprio, provocação periódica, dano, morte e fuga. A zona tinge de leve; variações (Dourado/Blindado/Gigante) tingem forte.
- **Relíquias:** 12, até nível 25, permanentes. O Rei (a cada 50 fases) sempre deixa uma; o General, 15%, **só depois do 1º Renascer** (com relíquias cedo, metade das corridas passava da parede da fase 40). Relíquias que você ainda não tem saem com o dobro de chance; com tudo no máximo, viram cristais.
- **Visuais do herói:** 8 (1 inicial + 7 por marcos), cada um dá +1% de dano (coleção). Trocar muda a cor do Cavaleiro na cena.
- **Combo:** toques com até 0,6 s entre eles. Marcos 50/100/200/400/800 dão um pouco de ouro (não altera o balanceamento: testado com e sem).
- **Parede da 1ª corrida:** continua no chefe da fase 40 por volta de 14 min. Em ~1 de cada 4 simulações a sorte (críticos/Pontos Fracos/Dourados) vence esse chefe e o jogador empaca na 48–50 por volta de 28 min — parede suave, aceitável.
- **UX:**
  - segurar para comprar (acelera);
  - botão de compra que "enche" conforme o ouro;
  - selo **MELHOR** no membro da guilda com mais DPS por ouro;
  - prévia "Dano depois de renascer ×N" com recomendação (a bolinha da aba só aparece quando dobra o dano);
  - **Coletar tudo**, com as conquistas prontas no topo;
  - deslizar para trocar de aba e transição suave;
  - habilidades em recarga ou bloqueadas explicam o que fazem ao tocar;
  - pulso quando a habilidade recarrega;
  - cartões de prêmio que não bloqueiam o jogo;
  - convite da recompensa diária ao voltar (nunca na 1ª abertura);
  - dica depois de perder para o chefe;
  - "Atual: +X%" na loja de cristais.

## Árvore de Talentos e Conjuntos de relíquias (v1.1)
- **Talentos:** 3 ramos (Lâmina, Guilda, Fortuna) com 5 nós cada; o 5º é um capstone de 5 pontos. Abre no **1º Renascer**: se abrisse antes, o ponto ganho na fase 25 já furava a parede da fase 40. Pontos = 1 por Renascer + 1 a cada 25 fases da maior fase (lidos do estado, sem acumulador). O nó k de um ramo exige 3×k pontos gastos nele. Redistribuir é grátis, para incentivar testar estilos.
- **Mecânicas novas nos talentos:**
  - Combo Furioso: +0,2% de dano de toque por toque do combo, até +10% a +50%;
  - Golpe Final: crítico ×1,5;
  - Contratos: guilda até −15%;
  - Acampamento: ouro offline +10%/nível;
  - Toque de Midas: +10 pp de chance de relíquia do General.
- **Conjuntos (4 × 3 relíquias):** 1º bônus com as 3; 2º com as 3 no nível 10.
  - Caçador: Ponto Fraco 25% mais frequente / +50% de dano nele;
  - Senhor da Guerra: +25% DPS / −10% recarga;
  - Tesoureiro: +25% ouro / +50% de tempo do Dourado;
  - Real: +2 s contra chefes / +10% cristais.
- **Bônus unificados:** `statBonus` = relíquias + talentos + conjuntos.
- **Rebalanceamento** (simulação ativa, 45 h): sem ajuste, talentos e conjuntos aceleravam o fim de jogo em ~35% (cap. 10 em 29 h, antes 45 h). Com o crescimento tardio dos cristais começando na fase **65** (antes 60) e **×1,05** (antes ×1,06):

  | Capítulo concluído | Tempo simulado |
  |---|---|
  | 3 | 27 min |
  | 4 | 1h20 |
  | 5 | 2h15 |
  | 6 | 2h55 |
  | 7 | 4h55 |
  | 8 | 9h30 |
  | 9 | ~20 h |
  | 10 | > 45 h (fase 195 em 37 h) |

  O começo (até o 1º Renascer) não muda.
- **Parede da 1ª corrida** (10 simulações): 7 de 10 param no chefe da fase 40 por volta de 14 min; 3 de 10 vencem por sorte e param na 48–50 (~30 min). Mesma distribuição de antes da v1.1.
