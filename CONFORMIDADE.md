# Relatório de conformidade — King Idle Savior Boy (Google Play + AdMob)

Inventário do que foi implementado no desenvolvimento, para validação por um revisor de conformidade.
Estado em 2026-10-05, branch `claude/play-compliance`. O que depende do dono está em [PUBLICAR.md](PUBLICAR.md).

---

## 1. Identidade do app

| Item | Valor |
|---|---|
| Nome | King Idle Savior Boy (igual em pt-BR, en e es) |
| Desenvolvedor | FSamp Labs |
| E-mail de contato | fefaofefao@gmail.com |
| Package / applicationId | `br.com.fernando.idleknight` (definitivo após a 1ª publicação) |
| Versão | versionName `1.0.0`, versionCode `106` (= número do run do workflow de release + 100) |
| Tipo | Jogo, gratuito, com anúncios; sem compras no app (estrutura de IAP existe, desligada: `ENABLE_IAP = false`) |
| Gênero | Idle/clicker RPG, fantasia cartoon 3D (esqueletos estilizados, sem sangue) |
| Público-alvo | 13+ (não direcionado a crianças) |
| Idiomas do app | pt-BR, en, es (escolha na 1ª abertura e no Menu) |
| Contas / login / chat / UGC | Nenhum. Sem servidor próprio, sem ranking online, sem interação entre usuários |

## 2. Build Android

| Item | Valor |
|---|---|
| Stack | Capacitor 8 (WebView) + Three.js; projeto em `android/` |
| minSdk / compileSdk / targetSdk | 24 / 36 / 36 |
| Formato de envio | **AAB** assinado com chave de upload (`bundleRelease`), gerado no GitHub Actions (`.github/workflows/android-release.yml`) |
| Assinatura | Keystore PKCS12, RSA 2048, alias `idleknight`, validade ~27 anos; guardada fora do repositório; credenciais só em GitHub Secrets. Previsto **Play App Signing** |
| AAB gerado | `KingIdleSaviorBoy-AAB-1.0.0-106` (11,7 MB, assinado), run 37251159104, branch principal `claude/youthful-hamilton-rx1ww2` (com o merge de `claude/play-compliance`) |
| Tamanho | Verificação automática no workflow: falha se AAB > 40 MB |
| Orientação | Retrato (`screenOrientation="portrait"`) |
| Ícone / splash | Ícone adaptativo (foreground/background) + splash, gerados por `@capacitor/assets` |
| Edge-to-edge / Android 15+ | SystemBars `insetsHandling: 'css'`; safe areas tratadas no CSS (HUD e botões não ficam sob o notch/barra) |
| Botão voltar | Fecha o modal aberto; sem modal, pergunta se quer sair |
| Ofuscação | `minifyEnabled false` (sem R8) |
| Segredos no código | Nenhum. IDs reais do AdMob, senhas e keystore só via GitHub Secrets (`ADMOB_APP_ID`, `ADMOB_REWARDED_ID`, `ADMOB_INTERSTITIAL_ID`, `ANDROID_KEYSTORE_*`, `ANDROID_KEY_*`) |
| Builds de teste | APK debug separado (workflow `android-apk.yml`) usa **sempre IDs de teste do Google** e tem painel de testes; o AAB de produção não tem painel de testes |

### Permissões (`AndroidManifest.xml`)
- `INTERNET`: anúncios.
- `POST_NOTIFICATIONS`: notificação local opcional ("baú offline cheio"); **opt-in**: pedida só ao ligar no Menu ou, com explicação, na 1ª vez que o baú offline enche; desligável no Menu.
- `VIBRATE`: efeito de vibração do jogo; desligável no Menu.
- `com.google.android.gms.permission.AD_ID`: adicionada automaticamente pelo SDK `play-services-ads` (merge do manifesto).
- **Não usa:** localização, câmera, microfone, contatos, armazenamento externo, `SCHEDULE_EXACT_ALARM` (a notificação usa alarme inexato), `QUERY_ALL_PACKAGES`, acessibilidade.
- `allowBackup="true"`: o save local pode entrar no backup pessoal do usuário (Google); mencionado na política.

## 3. AdMob / anúncios

| Item | Implementação |
|---|---|
| Plugin / SDK | `@capacitor-community/admob` 8.1 → `com.google.android.gms:play-services-ads` 25.4.x |
| App ID | `ca-app-pub-7483085200976329~3783366672` (via secret, injetado no manifesto por placeholder) |
| Blocos | Premiado `…/4618111204`; Intersticial `…/3911534196` (via secrets). **Sem banner** |
| Inicialização | `initialize()` com `tagForChildDirectedTreatment: false`, `tagForUnderAgeOfConsent: false`, **`maxAdContentRating: ParentalGuidance` (PG)**, alinhado à classificação IARC esperada (Livre/10+) |
| Anúncios não personalizados | Flag **`ADS_NON_PERSONALIZED = true`** (`src/config/app.ts`), ligada para **todos** os usuários: toda requisição (premiado e intersticial) vai com **`npa: true`** (o plugin envia o extra `npa=1` ao SDK). Medida adotada em atenção ao ECA Digital (Lei 15.211/2025). Testado em `tests/consent.test.ts` |
| Consentimento (UMP) | `requestConsentInfo` → `showConsentForm` quando `REQUIRED`. Anúncios só carregam se `canRequestAds`. **Nenhum anúncio é carregado nem exibido antes de o fluxo UMP terminar**: `showRewarded`/`showInterstitial` aguardam o `init` |
| Falha do UMP | O plugin rejeita sem devolver `canRequestAds` quando a consulta falha (ex.: sem rede). O app guarda localmente o último `canRequestAds` informado pelo SDK (`ads_can_request`) e, na falha, usa esse valor: **consentimento anterior continua valendo; sem consentimento anterior, sem anúncios** |
| Opções de privacidade | Menu → "Privacidade e anúncios" reabre o formulário UMP (`showPrivacyOptionsForm`); depois disso o consentimento é relido |
| Testes do consentimento | Sucesso; UMP negado; erro com consentimento anterior; erro sem consentimento; pedido de anúncio antes do UMP terminar (nada carrega antes) |
| Premiados (sempre opcionais, iniciados pelo jogador) | Ouro ×2 por 5 min (acumula até 30 min); coletar ganhos offline ×2; +15 s contra o chefe; baú do mensageiro ×5. Cada botão é identificado como anúncio ("Assista a um anúncio curto" + ícone) |
| Recompensa | Concedida **só** no evento `Rewarded` do SDK; fechar antes não dá recompensa; falha mostra mensagem amigável, sem recompensa |
| Intersticial | Só **depois de o jogador confirmar um Renascer** (pausa natural); nunca nos 10 primeiros minutos desde o 1º jogo; mínimo de 3 min entre intersticiais; nunca até 60 s após um premiado (`src/ads/AdPolicy.ts`, com testes) |
| Colocação | Nenhum anúncio perto de botões de jogo nem que dispare por toque acidental; sem anúncio na abertura do app nem ao sair |
| Áudio | O som do jogo é pausado durante o anúncio |
| app-ads.txt | `google.com, pub-7483085200976329, DIRECT, f08c47fec0942fa0`, pronto em `user-site/app-ads.txt` para o repositório `fefaofefao.github.io` (publicação pendente) |

## 4. Dados e privacidade

- **Coleta pelo desenvolvedor:** nenhuma. O progresso fica só no aparelho (Capacitor Preferences / SharedPreferences). Sem analytics próprio, sem Firebase, sem crash reporter de terceiros, sem servidor. O único dado novo guardado localmente é o booleano do último consentimento UMP (`ads_can_request`).
- **Exportar/importar save:** código de texto gerado localmente; fica com o usuário.
- **Coleta por terceiros:** só o SDK Google Mobile Ads/UMP (ID de publicidade, IP/local aproximado, interações com anúncios, diagnóstico). Com `npa: true`, os anúncios são **não personalizados**: o desenvolvedor não faz perfilamento e não pede anúncios baseados em perfil. O Google ainda pode usar dados para limite de frequência, medição agregada, anúncios contextuais e prevenção de fraude.
- **Notificações:** a permissão `POST_NOTIFICATIONS` **não** é pedida ao abrir o jogo. Ela é pedida só quando:
  - (a) o jogador liga o aviso no Menu; ou
  - (b) na 1ª vez que o baú offline enche, depois de uma tela explicando o motivo (botões "Agora não" / "Quero ser avisado").

  Se negada, o jogo segue normal e o Menu mostra o aviso desligado; se o Android tirar a permissão depois, o Menu desliga ao abrir. Save v6 (`settings.notifAsked`), com migração e testes.
- **Política de Privacidade** (pt/en/es): `docs/privacy-policy/index.html` → `https://fefaofefao.github.io/King-Idle-Savior-Boy/privacy-policy/`. Atualizada em **2026-10-05**. Cobre:
  - responsável pelo tratamento: **Fernando Martins Sampaio (FSamp Labs)**;
  - contato e público 13+;
  - dados locais e backup do Android;
  - AdMob: tipos de dado, finalidades e criptografia em trânsito;
  - classificação **PG**;
  - seção **"Anúncios não personalizados e ECA Digital"**: não personalizados para todos, nenhum perfilamento para publicidade, medida adotada em atenção à Lei 15.211/2025;
  - consentimento UMP e como rever a escolha;
  - redefinir o ID de publicidade;
  - notificações (nova regra de pedido);
  - crianças, direitos LGPD/GDPR/CCPA e alterações.
- **Termos de Uso** (pt/en/es): `docs/terms/index.html`, atualizados em 2026-10-05. Cobrem:
  - titular: Fernando Martins Sampaio (FSamp Labs);
  - licença;
  - itens virtuais sem valor monetário;
  - anúncios: não personalizados, PG;
  - conduta, propriedade intelectual;
  - garantia e responsabilidade (ressalva ao CDC);
  - lei brasileira e contato.
- **Links dentro do app:** Menu → "Política de privacidade" e "Termos de uso" abrem no navegador do sistema, no idioma do jogo.
- **Hospedagem:** GitHub Pages (pasta `/docs`).

### Respostas sugeridas para "Segurança dos dados" (Play Console)
- Coleta ou compartilha dados: **Sim** (SDK de anúncios). Criptografados em trânsito: **Sim**. Exclusão: sem dados em servidor; desinstalar apaga o save.
- Tipos de dados (**os mesmos**), coletados e compartilhados pelo SDK:
  - Identificadores do dispositivo (ID de publicidade);
  - Local aproximado;
  - Atividade no app → interações com o app;
  - Informações e desempenho do app → falhas e diagnóstico.
- Finalidades:
  - **Publicidade ou marketing**, agora **apenas anúncios não personalizados** (sem personalização/perfil);
  - **Análise**;
  - **Prevenção de fraudes, segurança e conformidade**.
- Coleta **obrigatória** enquanto houver anúncios (consentimento gerido pelo UMP onde exigido).

## 5. Classificação e público (respostas sugeridas)
- **IARC:**
  - violência de fantasia/cartoon sem sangue;
  - sem conteúdo sexual, linguagem imprópria, drogas, apostas ou jogos de azar com dinheiro;
  - sem interação entre usuários, sem compartilhamento de localização, sem compras digitais.
  - Esperado: Livre/10+ / PEGI 7 / ESRB E10+.
- **Classificação dos anúncios (AdMob):** **PG**, no código e a configurar igual no painel do AdMob.
- **Público-alvo:** 13–15, 16–17, 18+. Não marcar faixas < 13. Não destinado a crianças (fora do programa Famílias). Anúncios não personalizados para todos.
- **Anúncios:** Sim.
- **ID de publicidade:** Sim, para publicidade (não personalizada).
- **Acesso ao app:** tudo disponível sem login.
- **App de notícias / governo / financeiro / saúde:** Não.

### Mecânicas de sorte, baús e drops (auditoria, sem alterações)
Nada no jogo é obtido com dinheiro real:
- Compras no app estão desligadas (`ENABLE_IAP = false`, `DisabledPurchaseService.buyNoAds()` sempre retorna `false`).
- Não há loja de itens pagos.
- Não há moeda comprável.

| Mecânica | Aleatório? | Detalhe |
|---|---|---|
| **Baú do Mensageiro**: conteúdo | **Fixo** | Sempre ouro = max(60 s de renda, 8 abates da fase atual) × (1 + 15% por nível do Cálice do Mensageiro); valor mostrado **antes** de escolher |
| Baú: momento em que aparece | Aleatório | Atravessa a tela a cada 3–5 min (sorteio de tempo), por 8 s |
| Baú ×5 por anúncio (premiado) | **Fixo** | Multiplica por 5 o valor já mostrado; nada sorteado |
| Ouro ×2 por anúncio (premiado) | **Fixo** | ×2 de ouro por 5 min (acumula até 30 min) |
| Ganhos offline ×2 por anúncio (premiado) | **Fixo** | Dobra o valor já mostrado |
| +15 s contra o chefe por anúncio (premiado) | **Fixo** | Tempo fixo |
| **Relíquias** | Aleatório | Caem de chefes: Rei Esqueleto (fase 50, 100, …) sempre; General 15% (só após o 1º Renascer). Qual relíquia é sorteado (as que faltam têm peso 2). Repetidas sobem de nível; todas no máximo viram 2 cristais. **Nunca ligadas a anúncio** |
| Inimigos raros (Dourado/Blindado/Gigante) | Aleatório | Chance por inimigo (3,5% / 8% / 6%); Dourado dá ouro ×10 se derrotado em 7 s |
| Tipo de inimigo | Aleatório | Sorteio ponderado entre os tipos liberados pela fase |
| Golpe crítico | Aleatório | Chance base + melhorias |
| Ponto Fraco | Aleatório | Posição e intervalo (3,5–6,5 s) sorteados |
| Missões diárias | Aleatório (determinístico por dia) | 3 missões sorteadas com semente = data + início do jogo; recompensa fixa |
| Recompensa diária | **Fixo** | Calendário de 7 dias com valores conhecidos |
| Conquistas, Jornada do Rei, combo, visuais, bestiário | **Fixo** | Metas e recompensas conhecidas |

Conclusão: nenhum anúncio libera conteúdo aleatório. Os anúncios só multiplicam ou estendem valores fixos já exibidos. Os itens aleatórios (relíquias, raros) vêm só de jogar.

## 6. Ficha da loja (pronta em `store-listing/`)
- **Textos** em pt-BR, en e es: título "King Idle Savior Boy: RPG" (25 caracteres), descrição curta ≤ 80 e longa ≤ 4000. Informam "gratuito e contém anúncios; premiados opcionais"; sem promessas de prêmio real e sem termos enganosos.
- **Notas da versão 1.0.0** em 3 idiomas (≤ 500 caracteres cada).
- **Gráficos:** ícone 512×512 (PNG 32 bits), gráfico de destaque 1024×500, **8 capturas 1080×1920 por idioma**. São capturas do jogo real, sem elementos de terceiros e sem badges da Play.
- **Categoria sugerida:** Jogos → RPG (ou Casual).

## 7. Conteúdo e propriedade intelectual
- **Modelos 3D:** KayKit (Kay Lousberg), licença **CC0** (`licenses/`).
- **Sprites do Rei Esqueleto:** fornecidos pelo dono do projeto.
- **Fonte:** Fredoka, SIL OFL 1.1, embutida.
- **Sons, música, ícones SVG, cenários e criaturas:** gerados por código no próprio projeto.
- **Bibliotecas:** Three.js, break_infinity.js, Capacitor e plugin AdMob (todas MIT).
- **Créditos:** Menu → Créditos (3 idiomas) e `CREDITS.md`; tela inicial mostra "FSamp Labs · KayKit CC0".
- **Marcas de terceiros:** nenhuma usada no nome, ícone ou capturas.

## 8. Qualidade e funcionamento
- **Funciona offline;** só os anúncios precisam de conexão. Sem internet, os botões de anúncio mostram mensagem e não dão recompensa.
- **Save:**
  - automático a cada 10 s, ao ir para segundo plano e após ações importantes;
  - backup e restauração em caso de save corrompido;
  - migrações versionadas (`SCHEMA_VERSION` 5).
- **Proteção contra mudar o relógio** para ganhos offline.
- **Desempenho:** render a 30 fps quando ocioso; pausa total em segundo plano; resolução cai automaticamente em aparelhos lentos.
- **Testes:** 87 testes automatizados (Vitest) cobrindo:
  - fórmulas, save/migração e offline;
  - política de anúncios e fluxo do premiado;
  - i18n (as mesmas chaves nos 3 idiomas);
  - conteúdo.
  - CI (`ci.yml`) roda testes + build a cada push.

## 9. Pontos de atenção para o revisor
Resolvidos nesta revisão (branch `claude/play-compliance`):
- ~~Falha do UMP liberava anúncios~~ → usa o consentimento anterior; sem ele, sem anúncios (seção 3).
- ~~Notificação pedida na 1ª abertura~~ → opt-in (seção 4).
- Classificação dos anúncios: Teen → **PG**.
- Anúncios **não personalizados** para todos (ECA Digital).
- **Páginas de 16 KB:** checagem automática no workflow de release (`scripts/check-16kb.py`: lê o ELF de cada `.so` do AAB e exige `PT_LOAD p_align ≥ 16 KB`; falha o build se não). Resultado no build `KingIdleSaviorBoy-AAB-1.0.0-106` (run 37251159104): **0 bibliotecas nativas (.so) no AAB → compatível com páginas de 16 KB** (o app é WebView + Java/Kotlin; o SDK de anúncios não traz `.so`). A checagem continua ativa para futuras dependências nativas.
- **Botão voltar / predictive back (targetSdk 36):**
  - o `@capacitor/app` 8 registra um `OnBackPressedCallback` do AndroidX (`getOnBackPressedDispatcher().addCallback`), compatível com `OnBackInvokedCallback` no Android 13+;
  - o jogo trata o evento `backButton` (fecha o modal; sem modal, confirma a saída e chama `App.exitApp()`);
  - sem mudança de manifesto/código. Como o callback fica sempre ativo, o sistema não mostra a animação "voltar para a tela inicial"; o jogo confirma a saída;
  - **testar em aparelho Android 15/16**.
- **versionCode** = `github.run_number + 100` (nunca regride; os AABs 1.0.0 antigos usaram 1–4).

Ainda em aberto:
1. ~~CPF na política e nos termos~~ → **removido**. Política e termos identificam o responsável só pelo nome (Fernando Martins Sampaio, FSamp Labs) e o e-mail de contato, como pede a LGPD.
2. ~~Relíquia "Cálice do Mensageiro" sem efeito~~ → **corrigido**: o ouro do baú agora é multiplicado por (1 + 15% × nível), exatamente como a descrição promete (`Game.chestGold`, com teste). As 12 relíquias foram conferidas: todas aplicam o bônus descrito.
3. **Package ID** contém "idleknight" (nome antigo do projeto); não muda após publicar.
4. **Configurações no painel do AdMob a espelhar:** classificação máxima **PG**; mensagens GDPR e "estados dos EUA" publicadas.
5. **Publicações pendentes:** GitHub Pages da política/termos; `user-site/` no repositório `fefaofefao.github.io`.
6. **Conta pessoal nova:** teste fechado com 12+ testadores por 14 dias antes da produção.

## 10. Onde está cada coisa
- `PUBLICAR.md`: checklist do dono (contas, burocracia, ordem dos passos)
- `SETUP_CONTAS.md`: passo a passo detalhado (keystore, AdMob, Secrets, Play Console, formulários)
- `docs/`: site (política, termos, início)
- `store-listing/`: textos, notas, gráficos e capturas
- `src/ads/`: anúncios (AdService, AdMobAdService, AdPolicy)
- `android/`: projeto nativo; `.github/workflows/`: CI, APK de teste, AAB de release
