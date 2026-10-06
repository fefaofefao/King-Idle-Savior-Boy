# Testando o APK — King Idle Savior Boy

## 1. Baixar o APK
1. No GitHub, abra o repositório → aba **Actions** → workflow **"Android APK (teste)"**.
2. Clique na execução mais recente com ✅ verde.
3. Em **Artifacts**, baixe `KingIdleSaviorBoy-APK-N`. Vem um `.zip`; extraia e pegue o `.apk`.
   (Cada push no repositório gera um APK novo. O arquivo fica disponível por 30 dias.)

## 2. Instalar no Android
1. Envie o `.apk` para o celular (cabo, Google Drive, WhatsApp para você mesmo...).
2. Toque no arquivo. Se o Android pedir, permita **"Instalar apps desconhecidos"** para o app que abriu o arquivo.
3. Se o Play Protect avisar "app não verificado", toque em **Instalar mesmo assim**. É normal para um APK de teste.
4. Para atualizar, instale o APK novo por cima: o progresso é mantido.

> É um build de **teste**: usa só **anúncios de teste do Google** (aparecem com a etiqueta "Test Ad") e é assinado com a chave de debug. Não serve para enviar à Play Store; para isso use o workflow "Android Release (AAB)" (veja `SETUP_CONTAS.md`).

## 3. Painel de testes (atalhos)
**Menu → toque 5 vezes no número da versão** (no fim da aba). Aparecem os botões:
- **+10 min de ouro**, **+25 cristais**, **+10 fases** (troca de zona a cada 50 fases)
- **Simular 8 h offline** (abre o "Bem-vindo de volta", se a guilda tiver DPS)
- **Zerar recargas** das habilidades
- **+1 relíquia** (testa o cartão de prêmio e a coleção na aba Herói)
- **Apagar progresso** (recomeça do zero, com tela de idioma e tutorial)

## 4. Roteiro de teste sugerido

**Primeira abertura**
- [ ] Tela inicial com o logo, as bandeiras e o botão Jogar (mostra "Carregando…" e depois "Jogar")
- [ ] Trocar o idioma na tela inicial (pt/en/es)
- [ ] História do Capítulo 1 → mãozinha "Toque no inimigo"
- [ ] Missões do tutorial guiam: tocar → derrotar → Lâmina → contratar o Escudeiro

**Jogo**
- [ ] Toque rápido: o Cavaleiro avança e golpeia; números de dano; crítico amarelo com tremida e vibração
- [ ] Moedas voando até o contador; som de moeda
- [ ] Chefe na fase 10: timer, aura, "+15 s (anúncio)" quando o tempo acaba
- [ ] "Enfrentar chefe" depois de perder
- [ ] Maga aparece na fase 5 e lança projéteis
- [ ] Habilidades (fases 15/30/60) com recarga visível
- [ ] Baú do Mensageiro atravessando a tela (a cada 3–5 min)
- [ ] Rastreador de missão no topo: fica verde quando cumprida; tocar coleta a recompensa
- [ ] Fim de capítulo: banner + história do próximo capítulo

**Conteúdo novo (versão final)**
- [ ] Criaturas: Geleca (fase 2+), Cogumelo (8+), Morcego (16+), Golem (36+), Diabrete (46+), com animações próprias
- [ ] Relíquias: o Rei Esqueleto (fase 50) sempre deixa uma; cartão de prêmio aparece e some sozinho
- [ ] Aba Herói: Visuais (tocar num liberado troca a cor do Cavaleiro) e Relíquias
- [ ] Combo: a partir de 10 toques seguidos aparece o contador à esquerda; marcos 50/100/200… dão ouro
- [ ] Segurar o botão de compra compra várias vezes (cada vez mais rápido)
- [ ] Botão de compra "enche" de verde conforme o ouro se aproxima do preço
- [ ] Selo MELHOR na Guilda; "Dano depois de renascer ×N" na aba Renascer
- [ ] Missões: "Coletar tudo" quando há 2+ prontas; conquistas prontas aparecem no topo
- [ ] Deslizar o dedo para os lados no painel troca de aba
- [ ] Tocar numa habilidade em recarga ou bloqueada mostra o que ela faz
- [ ] Voltar no dia seguinte: convite da recompensa diária
- [ ] Jornada: 10 capítulos (Ruínas, Pântano, Cidadela, Abismo, Trono Eterno)

**Talentos e conjuntos (v1.1)**
- [ ] Antes do 1º Renascer, a árvore (aba Renascer) aparece bloqueada; depois dele, "+N pontos de talento"
- [ ] Tocar num talento sobe 1 nível; nós de baixo liberam com 3/6/9/12 pontos no ramo; "Redistribuir" devolve tudo
- [ ] Combo Furioso: o contador de combo mostra "+X% dano"
- [ ] Aba Herói → Conjuntos de relíquias: ao completar 3 relíquias de um conjunto, aparece "Conjunto … ativado!"

**Anúncios (de teste)**
- [ ] Consentimento (UMP) na primeira abertura (aparece só em algumas regiões, como Europa)
- [ ] Ouro ×2 (botão azul no topo), Coletar ×2 offline, +15 s no chefe, Baú ×5
- [ ] Interstitial só depois de um Renascer (e nunca nos primeiros 10 min)
- [ ] Sem internet: mensagem amigável e nenhuma recompensa

**Sistema**
- [ ] Botão voltar: fecha o modal aberto; sem modal, pergunta se quer sair
- [ ] Sair e voltar depois de alguns minutos: "Bem-vindo de volta"
- [ ] Notificação "Baú cheio" (8 h fechado; desligável no Menu)
- [ ] Notch e barra de navegação não cobrem botões (Android 15+)
- [ ] Desempenho: o jogo fica fluido? O celular esquenta? Gasto de bateria em 15 min
- [ ] Som, música, vibração e volume no Menu
- [ ] Exportar e importar save (Menu)

## 5. Como relatar um problema
Mande: modelo do celular + versão do Android, a versão do jogo (no fim do Menu, ex. `v0.1.7-test`), o que fez, o que esperava e um print/vídeo, se possível.
