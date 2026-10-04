# GAME_SPEC — Cavaleiro Ocioso (Idle Tap Knight)

> Especificação completa e consolidada para o Claude Code (versão 2, com os assets KayKit).
> Arquivos que acompanham esta especificação: `GAME_SPEC.md` (este) e `assets_kaykit.zip` (modelos 3D, armas, animações e `ASSETS.md`).

## 0. Instruções para o Claude Code

- **Primeiro passo:** extraia `assets_kaykit.zip` na raiz do repositório. Isso cria `public/models/...`, `licenses/` e `ASSETS.md`. Leia o `ASSETS.md` inteiro antes de escrever o código 3D: ele é a fonte de verdade sobre modelos, ossos, armas e animações, e prevalece sobre este documento em caso de conflito nesses assuntos. Depois de extrair, não versione o zip.

- Você é o desenvolvedor responsável pelo jogo inteiro. Tome as decisões técnicas sozinho e só pare para perguntar se algo for realmente impossível de decidir. Registre cada decisão relevante em `DECISIONS.md`, com uma linha de justificativa.
- Mantenha um `CLAUDE.md` atualizado com: como rodar, estrutura de pastas, comandos, e o estado atual de cada fase de entrega.
- Trabalhe por fases (seção 12). Ao fim de cada fase o jogo deve rodar, os testes devem passar, e o trabalho vai em um commit com mensagem clara.
- O dono do projeto não é programador de jogos. Tudo deve funcionar sem configuração manual, exceto o que depender das contas dele (AdMob, Google Play, keystore). Para esses itens, gere um `SETUP_CONTAS.md` com o passo a passo exato.
- Nunca coloque IDs reais do AdMob, senhas ou keystore no código. Use variáveis de ambiente e GitHub Secrets.

## 1. Visão geral

- **Gênero:** clicker + RPG ocioso (idle), em tela vertical (portrait).
- **Plataforma:** Android (Google Play). O jogo também roda no navegador para desenvolvimento e testes.
- **Tema:** fantasia medieval cartoon, com personagens 3D low-poly estilizados (KayKit) e cores vivas.
- **Idiomas:** português (pt-BR) e inglês (en), detectados pelo idioma do aparelho e alteráveis nas configurações.
- **Nome:** "Cavaleiro Ocioso" (pt) / "Idle Tap Knight" (en).
- **Package ID:** `br.com.fernando.idleknight`. Ele não pode ser alterado depois da publicação. Deixe-o em uma única constante/config.
- **Público-alvo:** 13+. O jogo NÃO é direcionado a crianças, para não cair na política "Famílias" da Play e nas restrições de anúncios que vêm com ela.

## 2. Stack técnica (decidida)

- **Vite + TypeScript** (strict). A UI é feita em HTML/CSS sobre o canvas, sem framework pesado. Se a UI crescer, Preact é permitido.
- **Three.js** para a cena 3D (carregamento GLB via `GLTFLoader` + `DRACOLoader`/meshopt).
- **break_infinity.js** (ou equivalente) para números grandes.
- **Capacitor (última versão estável)** para empacotar no Android.
- Plugins:
  - `@capacitor-community/admob` para os anúncios
  - `@capacitor/preferences` para o save
  - `@capacitor/app` para pausa/retomada e o botão voltar
  - `@capacitor/haptics` para a vibração
  - `@capacitor/local-notifications` para avisar quando o baú offline estiver cheio
  - `@capacitor/splash-screen`
- **Vitest** para os testes unitários das fórmulas e do save.
- **GitHub Actions** para gerar o AAB assinado.
- **Android:** `minSdk 24`. O `targetSdk` deve ser o mínimo exigido atualmente pela Google Play para apps novos (confirme na documentação oficial no momento da implementação). A orientação é travada em portrait.

## 3. Loop principal

1. Um inimigo aparece no centro da tela. Cada toque do jogador faz o Cavaleiro atacar e causa **dano de toque**.
2. A guilda causa **DPS** automático contínuo, mesmo sem toques.
3. Ao derrotar o inimigo, o jogador ganha **ouro**, que voa da posição do inimigo até o contador.
4. Cada **fase** tem 10 inimigos. A cada 10 fases (10, 20, 30…) há um **chefe** com **30 segundos** para ser derrotado.
   - Se o tempo acabar, o jogador volta para a fase anterior e fica farmando nela. Um botão "Enfrentar chefe" permite tentar de novo.
5. O ouro serve para comprar upgrades de toque, contratar e evoluir membros da guilda e desbloquear habilidades.
6. Quando o progresso desacelera, o jogador usa o **Renascer** (prestígio): zera as fases e o ouro e ganha **Cristais da Alma**, que são permanentes.
7. Enquanto o jogo está fechado, ele acumula **ganhos offline**.

## 4. Sistemas e fórmulas

As fórmulas abaixo são o ponto de partida. Crie `scripts/balance-sim.ts`, que simula um jogador (toques por segundo configuráveis, compra gananciosa do upgrade de melhor custo-benefício) e imprime a curva de progresso. Ajuste as constantes (todas em `src/config/balance.ts`) até bater as **metas de ritmo**:

- Fase 10 (primeiro chefe): 2 a 4 min.
- Primeiro Renascer disponível (fase 40): 35 a 60 min de jogo ativo.
- Fase 100 alcançável por volta do 3º dia de jogo casual (sessões curtas + offline).
- O jogador nunca deve ficar mais de ~5 min sem algo para comprar nas primeiras 2 horas.

### 4.1 Inimigos
- HP do inimigo comum na fase n: `HP(n) = 10 × 1.19^(n−1)`.
- HP do chefe: `HP(n) × 10`.
- Ouro do inimigo comum: `HP(n) × 0.09`. O chefe dá `× 6` desse valor.

### 4.2 Toque (Cavaleiro)
- Dano base 1. Cada nível do upgrade "Lâmina" soma +1 de dano base.
- Custo da Lâmina no nível L: `10 × 1.07^L`.
- Marcos de nível 25/50/100/200/400 multiplicam o dano de toque por ×2.
- Crítico: 5% de chance de ×5 (pode ser melhorado por cristais).
- Upgrade "Toque Arcano": o toque passa a somar uma % do DPS total (1% por nível, máximo 10 níveis, custo alto). É ele que mantém o toque relevante no fim do jogo.

### 4.3 Guilda (dano ocioso)
São 8 membros, desbloqueados em sequência. Os nomes são traduzíveis. Os ícones são em SVG flat, feitos por você no mesmo estilo:

| # | Membro | Custo base | DPS base |
|---|---|---|---|
| 1 | Escudeiro | 50 | 5 |
| 2 | Arqueira | 500 | 30 |
| 3 | Clérigo | 5e3 | 180 |
| 4 | Ladino | 6e4 | 1.1e3 |
| 5 | Bárbaro | 8e5 | 7e3 |
| 6 | Druida | 1.2e7 | 4.5e4 |
| 7 | Paladino | 2e8 | 3e5 |
| 8 | Dragoneiro | 4e9 | 2.2e6 |

- Custo do nível L: `custoBase × 1.075^L`.
- Os marcos 10/25/50/100 dão ×2 no DPS daquele membro. O marco 200 dá ×4.
- O companheiro **Mago/Maga** (`mage.glb`; o nome segue a aparência do modelo, conforme o `ASSETS.md`) é desbloqueado na fase 5. Ele fica visível atrás do Cavaleiro e lança um projétil a cada 1,5 s, usando a animação `Throw`. Seu dano é igual a 20% do DPS total, aplicado de forma visual (o DPS da guilda continua contínuo).
- Botões de compra ×1 / ×10 / ×25 / MAX.

### 4.4 Habilidades ativas
São 3 habilidades, desbloqueadas nas fases 15, 30 e 60. Ficam como botões grandes acima do painel inferior, com indicação visual de cooldown:
- **Golpe Furioso:** causa instantaneamente 30 s de DPS. Cooldown de 5 min.
- **Fúria:** dano de toque ×3 por 30 s. Cooldown de 8 min.
- **Chuva de Ouro:** ouro ×2 por 30 s. Cooldown de 10 min.

### 4.5 Renascer (prestígio)
- Disponível a partir da fase 40.
- `Cristais = floor( ((faseMax − 30) / 5) ^ 1.3 )`. Ajuste pelo simulador para que o primeiro Renascer dê entre 5 e 15 cristais.
- Cada cristal *não gasto* dá +5% de dano global.
- **Loja de Cristais**, com 6 upgrades permanentes:
  - Dano global +25%/nível
  - Ouro +20%/nível
  - Chance de crítico +1%/nível
  - Tempo do chefe +2 s/nível
  - Limite offline +1 h/nível
  - Cooldown de habilidades −5%/nível
  - O custo de cada um é crescente.
- Antes de confirmar, mostre um resumo: "Você ganhará X cristais. Seu dano será Y vezes maior."

### 4.6 Ganhos offline
- O ouro offline é `DPS × segundosOffline × 0.5`, com limite padrão de **8 h**.
- Ao abrir o jogo, aparece um modal "Bem-vindo de volta" com o valor ganho e dois botões: "Coletar" e "Coletar ×2 (assistir anúncio)".
- Proteção contra manipulação de relógio: se o horário do aparelho voltar para trás, não conceda ganhos e reajuste o último timestamp.

### 4.7 Retenção
- **Recompensa diária:** um calendário de 7 dias com prêmios crescentes (o 7º dia dá cristais). O ciclo recomeça depois do 7º dia, e um dia perdido não zera o progresso.
- **3 missões diárias**, sorteadas de uma lista. Exemplos: "Toque 500 vezes", "Derrote 2 chefes", "Contrate 10 níveis na guilda". Nenhuma missão pode exigir assistir anúncio.
- **Conquistas:** cerca de 30 conquistas com pequenas recompensas. Exemplos: fase alcançada, toques totais, chefes derrotados, renascimentos.
- **Baú do Mensageiro:** a cada 3–5 min (aleatório), um baú atravessa a tela por 8 s. Tocar nele dá um bônus de ouro; aceitar um anúncio dá ×5 desse bônus. O evento fica desligado nos primeiros 3 minutos da primeira sessão.
- **Notificação local:** quando o baú offline encher, envie uma notificação (traduzida). O jogador pode desligar nas configurações.

## 5. Zonas e visual

- A cada 50 fases a zona muda, em ciclo: **Floresta → Caverna → Deserto → Gelo → Vulcão**.
- Os cenários são procedurais em Three.js: fundo em gradiente, chão estilizado e props low-poly simples (árvores, pedras, cristais, cactos) gerados por código, sem assets externos.
- **Inimigos:** existem 4 esqueletos KayKit. Minion, Rogue e Mage são os inimigos comuns (o Minion é o mais frequente). O Warrior é o chefe, em escala ×1.6, com aura e nome em destaque. Cada zona tem uma variação de cor/material (tint/emissive) e de nome. Exemplos: "Esqueleto da Floresta", "Esqueleto Gélido", "Esqueleto Vulcânico".
- **Animações:** os personagens têm esqueleto. Use os clipes reais compartilhados (`rig_medium_general.glb`) via `AnimationMixer`, como detalhado no `ASSETS.md`:
  - Inimigos: Spawn → Idle → Hit → Death.
  - Mago: Idle e Throw.
  - Cavaleiro: Idle, com ataque por fallback procedural (avanço + rotação aditiva do braço em `KnightAttack.ts`) até existir um clipe de ataque.
  - Efeitos procedurais extras por cima das animações: flash branco + leve squash no impacto e encolhimento + giro + explosão de partículas após o clipe de morte.
- **Feedback de combate:** números de dano flutuantes (críticos maiores e em amarelo), moedas voando até o contador, leve tremida de câmera no crítico e vibração curta (que pode ser desligada).
- **Câmera:** fixa, em perspectiva levemente de cima. O Cavaleiro fica à esquerda, o inimigo no centro-direita e o Mago atrás do Cavaleiro, levemente deslocado para ser visível.
- **Robustez:** se algum GLB falhar ao carregar, use uma forma primitiva colorida no lugar e registre um aviso. O jogo nunca pode travar por causa de um asset. Mostre uma tela de carregamento com barra de progresso enquanto os modelos carregam.

### 5.1 Assets 3D
- Os modelos são KayKit Adventurers 2.0 + KayKit Skeletons 1.1 (CC0), já organizados em `public/models/` pelo `assets_kaykit.zip`. Arquivos, papéis, ossos (`handslot.r`/`handslot.l`) e clipes estão detalhados no `ASSETS.md`.
- Os modelos já são leves (menos de 500 KB cada). Mantenha `scripts/optimize-models.sh` (`@gltf-transform/cli`, compressão meshopt) como etapa opcional do build, sem alterar a aparência.
- Escalas e posições ficam centralizadas em `src/config/visual.ts`. Normalize o pé no chão pela bounding box.
- Iluminação para o estilo cartoon: hemisphere + directional. Use uma sombra circular falsa sob cada personagem, sem shadow maps, para economizar bateria.
- Use cache de recursos: carregue cada GLB e o arquivo de animações uma única vez e clone com `SkeletonUtils.clone` para cada inimigo.

### 5.2 Áudio
- Gere efeitos sonoros procedurais com Web Audio (estilo sfxr): toque, crítico, moeda, morte, chefe, compra e level up. Não use arquivos de áudio de terceiros.
- Música opcional: um loop simples gerado por código ou nenhuma. O volume é separado para música e efeitos.

## 6. Interface (portrait)

- **Topo:** ouro (com ganho por segundo), cristais, fase atual com uma barra de "inimigos 3/10" e o timer do chefe quando houver.
- **Centro:** a cena 3D. A área de toque é a tela toda acima do painel.
- **Barra de habilidades** logo acima do painel.
- **Painel inferior com abas:** Herói (Lâmina, Toque Arcano) · Guilda · Renascer/Cristais · Missões & Conquistas · Menu.
- **Menu:** configurações (som, música, vibração, notificações, idioma, notação numérica curta/científica), estatísticas, exportar/importar save (código de texto), privacidade/consentimento de anúncios, créditos e "Remover anúncios" (oculto enquanto desabilitado).
- **Botão voltar do Android:** fecha o modal aberto; se não houver modal, pede confirmação para sair.
- Respeite as safe areas (notch e barra de navegação).
- Os botões têm no mínimo 48dp e a fonte é legível.
- Use 1 fonte do Google Fonts embutida localmente, sem CDN no app.

## 7. AdMob

- Crie `src/ads/AdService.ts` com uma interface única e duas implementações:
  - `AdMobAdService`, usada no Android.
  - `MockAdService`, usada no navegador, que simula 2 s de "anúncio" e concede a recompensa.
- Durante o desenvolvimento, use sempre os **IDs de teste oficiais do Google**. Os IDs reais (App ID, rewarded e interstitial) vêm de variáveis de build/Secrets.
- Antes de inicializar os anúncios, implemente o **consentimento UMP** (Google User Messaging Platform), com um botão para reabrir o formulário no menu.
- Declare `tagForChildDirectedTreatment: false` e uma classificação de conteúdo máxima adequada (ex.: T).

**Rewarded (fonte principal de receita):**
- Dobrar os ganhos offline.
- Buff "Ouro ×2" por 5 min, acumulável até 30 min, ativado por um botão fixo no topo.
- "+15 s contra o chefe", oferecido quando o tempo acaba, uma vez por chefe.
- Baú do Mensageiro ×5.
- Todo rewarded é **sempre opcional** e tem um texto claro de que é um anúncio. Se o anúncio falhar ou não carregar, mostre uma mensagem amigável e não conceda a recompensa.
- Pré-carregue o próximo rewarded logo após exibir um.

**Interstitial (uso mínimo):**
- Aparece somente após confirmar um Renascer.
- Intervalo mínimo de 3 min entre interstitials.
- Nunca nos primeiros 10 min da primeira sessão e nunca logo após um rewarded.

**Banner:** não usar. A configuração `ENABLE_BANNER` existe, mas fica `false`.

**Remover anúncios:**
- Deixe a estrutura pronta, mas desabilitada: a configuração `ENABLE_IAP = false` e a interface `PurchaseService`.
- O efeito planejado é remover os interstitials e conceder automaticamente o buff de ouro ×2 permanente. Os rewarded continuam opcionais.
- A implementação com Google Play Billing fica para depois. Documente em `DECISIONS.md` qual plugin usar.
- Gere o arquivo `app-ads.txt` modelo e explique em `SETUP_CONTAS.md` onde publicá-lo.

## 8. Save e dados

- Salvamento automático a cada 10 s, ao comprar algo relevante e quando o app vai para segundo plano (`appStateChange`).
- O save é um JSON com `schemaVersion` e funções de migração entre versões. Os números grandes são serializados como string.
- Mantenha um backup do save anterior. Se o save atual estiver corrompido, restaure o backup.
- Exportar/importar save como código base64 com checksum.
- Testes unitários para: fórmulas, migração de save, cálculo offline, proteção de relógio e cálculo de cristais.

## 9. Performance e bateria

- `pixelRatio` limitado a 2. Em aparelhos fracos (detectar por FPS médio), reduza para 1.5 automaticamente.
- 60 fps durante a interação. Após 20 s sem toque, caia para 30 fps.
- Pause o render e os timers quando o app estiver em segundo plano. O progresso nesse período é calculado pelo sistema offline.
- Meta de tamanho do AAB: menos de 40 MB.
- O jogo deve funcionar **totalmente offline**, exceto os anúncios.

## 10. Build e publicação

- Scripts npm: `dev`, `build`, `test`, `sim` (simulador de balanceamento), `optimize-models`, `android:sync`, `android:open`.
- Gere ícone adaptativo e splash com `@capacitor/assets`, partindo de um ícone 1024px. Crie o ícone a partir de um render do Cavaleiro (`knight.glb` com espada e escudo, enquadrado do peito para cima, fundo em gradiente azul), gerado por um script com Three.js headless/Puppeteer, ou monte um SVG equivalente se o render não for viável.
- **GitHub Actions** (`.github/workflows/android-release.yml`):
  - É disparado por uma tag `v*` ou manualmente.
  - Etapas: instala as dependências, roda os testes, faz o build web, `cap sync android` e `./gradlew bundleRelease`.
  - Assina o AAB com a keystore vinda de Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Os IDs do AdMob vêm de `ADMOB_APP_ID`, `ADMOB_REWARDED_ID` e `ADMOB_INTERSTITIAL_ID`.
  - O `versionCode` é gerado automaticamente (número do run) e o `versionName` vem da tag.
  - O AAB é publicado como artifact do workflow.
  - Etapa opcional, desligada se o secret não existir: enviar para a faixa de **teste interno** da Play com uma service account (`PLAY_SERVICE_ACCOUNT_JSON`).
- Crie também um workflow de CI que roda testes + build a cada push.

## 11. Documentos que você deve gerar

- `SETUP_CONTAS.md`: o passo a passo para o dono do projeto. Deve cobrir:
  - Criar o app e os blocos de anúncio no AdMob.
  - Criar e guardar a keystore (com alerta: perder a keystore = perder o app; usar o Play App Signing).
  - Cadastrar os GitHub Secrets.
  - Criar o app no Play Console.
  - Formulário de Segurança de Dados (respostas sugeridas, considerando o SDK do AdMob).
  - Classificação de conteúdo e público-alvo 13+.
  - Teste fechado obrigatório para contas pessoais novas (mínimo de testadores e dias exigidos atualmente pela Play).
  - Envio para produção.
- `privacy-policy/index.html`: política de privacidade em pt e en, mencionando o AdMob/UMP e o save local. Deve ser pronta para publicar no GitHub Pages, com instruções.
- `store-listing/`: título, descrição curta e descrição longa em pt-BR e en, e uma lista dos screenshots a capturar.
- `CREDITS.md`: "3D characters, weapons and animations: Kay Lousberg — KayKit (www.kaylousberg.com), CC0". Esse texto também aparece na tela de créditos do jogo. Mantenha as licenças em `licenses/`.

## 12. Fases de entrega

1. **Núcleo jogável no navegador:** cena com os modelos KayKit carregados (animações básicas Idle/Hit/Death), toque, inimigos, fases, chefe com timer, ouro, upgrade de toque, guilda, números grandes, save local e testes das fórmulas.
2. **Progressão completa:** habilidades, Renascer + Loja de Cristais, ganhos offline, recompensa diária, missões, conquistas, Baú do Mensageiro, estatísticas, i18n pt/en, simulador de balanceamento rodado e constantes ajustadas (cole o resultado da simulação no `DECISIONS.md`).
3. **Visual e "game feel":** zonas procedurais, armas presas nas mãos, todas as transições de animação do `ASSETS.md`, ataque do Cavaleiro (`KnightAttack.ts`), projétil do Mago, partículas, números de dano, áudio procedural, polimento da UI.
4. **Android + AdMob:** Capacitor, AdService (mock + real), UMP, regras de frequência, botão voltar, safe areas, haptics, notificações locais, ícone e splash.
5. **Build e publicação:** workflows do GitHub Actions, otimização dos modelos, `SETUP_CONTAS.md`, política de privacidade, textos da loja.
6. **Revisão final:** revise o código, rode todos os testes, confira o tamanho do AAB e a performance, e liste no `CLAUDE.md` o que falta e depende do dono do projeto.

## 13. Fora do escopo (por enquanto)

Multiplayer, ranking online, login, nuvem, compras reais (somente a estrutura), loja de skins, eventos sazonais e analytics. Deixe pontos de extensão simples, mas não implemente.
