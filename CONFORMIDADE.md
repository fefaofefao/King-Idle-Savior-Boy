# Relatório de conformidade — King Idle Savior Boy (Google Play + AdMob)

Inventário do que foi implementado no desenvolvimento, para validação por um revisor de conformidade.
Estado em 2026-10-05, branch `claude/youthful-hamilton-rx1ww2`. O que depende do dono está em [PUBLICAR.md](PUBLICAR.md).

---

## 1. Identidade do app

| Item | Valor |
|---|---|
| Nome | King Idle Savior Boy (igual em pt-BR, en e es) |
| Desenvolvedor | FSamp Labs |
| E-mail de contato | fefaofefao@gmail.com |
| Package / applicationId | `br.com.fernando.idleknight` (definitivo após a 1ª publicação) |
| Versão | versionName `1.0.0`, versionCode `4` (= número do run do workflow de release) |
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
| AAB gerado | `KingIdleSaviorBoy-AAB-1.0.0-4` (11,7 MB), run 37244728314 |
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
- `POST_NOTIFICATIONS`: notificação local opcional ("baú offline cheio"); pedida em tempo de execução e desligável no Menu.
- `VIBRATE`: efeito de vibração do jogo; desligável no Menu.
- `com.google.android.gms.permission.AD_ID`: adicionada automaticamente pelo SDK `play-services-ads` (merge do manifesto).
- **Não usa:** localização, câmera, microfone, contatos, armazenamento externo, `SCHEDULE_EXACT_ALARM` (a notificação usa alarme inexato), `QUERY_ALL_PACKAGES`, acessibilidade.
- `allowBackup="true"`: o save local pode entrar no backup pessoal do usuário (Google); mencionado na política.

## 3. AdMob / anúncios

| Item | Implementação |
|---|---|
| Plugin / SDK | `@capacitor-community/admob` 8.x → `com.google.android.gms:play-services-ads` 25.4.x |
| App ID | `ca-app-pub-7483085200976329~3783366672` (via secret, injetado no manifesto por placeholder) |
| Blocos | Premiado `…/4618111204`; Intersticial `…/3911534196` (via secrets). **Sem banner** |
| Inicialização | `initialize()` com `tagForChildDirectedTreatment: false`, `tagForUnderAgeOfConsent: false`, `maxAdContentRating: Teen` |
| Consentimento | **Google UMP** (`requestConsentInfo` → `showConsentForm` quando `REQUIRED`) **antes** de carregar anúncios; anúncios só carregam se `canRequestAds` |
| Opções de privacidade | Menu → "Privacidade e anúncios" reabre o formulário UMP (`showPrivacyOptionsForm`) |
| Premiados (sempre opcionais, iniciados pelo jogador) | Ouro ×2 por 5 min (acumula até 30 min); coletar ganhos offline ×2; +15 s contra o chefe; baú do mensageiro ×5. Cada botão é identificado como anúncio ("Assista a um anúncio curto" + ícone) |
| Recompensa | Concedida **só** no evento `Rewarded` do SDK; fechar antes não dá recompensa; falha mostra mensagem amigável, sem recompensa |
| Intersticial | Só **depois de o jogador confirmar um Renascer** (pausa natural); nunca nos 10 primeiros minutos desde o 1º jogo; mínimo de 3 min entre intersticiais; nunca até 60 s após um premiado (`src/ads/AdPolicy.ts`, com testes) |
| Colocação | Nenhum anúncio perto de botões de jogo nem que dispare por toque acidental; sem anúncio na abertura do app nem ao sair |
| Áudio | O som do jogo é pausado durante o anúncio |
| app-ads.txt | `google.com, pub-7483085200976329, DIRECT, f08c47fec0942fa0` (arquivo pronto; publicação na raiz do domínio pendente) |

## 4. Dados e privacidade

- **Coleta pelo desenvolvedor:** nenhuma. O progresso fica só no aparelho (Capacitor Preferences / SharedPreferences). Sem analytics próprio, sem Firebase, sem crash reporter de terceiros, sem servidor.
- **Exportar/importar save:** código de texto gerado localmente; fica com o usuário.
- **Coleta por terceiros:** só o SDK Google Mobile Ads/UMP (ID de publicidade, IP/local aproximado, interações com anúncios, diagnóstico).
- **Política de Privacidade** (pt/en/es): `docs/privacy-policy/index.html` → `https://fefaofefao.github.io/King-Idle-Savior-Boy/privacy-policy/`. Cobre:
  - responsável (FSamp Labs) e contato;
  - público 13+;
  - dados locais e backup do Android;
  - AdMob: tipos de dado, finalidades, criptografia em trânsito;
  - consentimento UMP (EEE/UK/Suíça/estados dos EUA) e como rever a escolha;
  - redefinir o ID de publicidade;
  - notificações locais;
  - crianças;
  - direitos LGPD/GDPR/CCPA;
  - alterações.
- **Termos de Uso** (pt/en/es): `docs/terms/index.html`: licença, itens virtuais sem valor monetário, anúncios, conduta, propriedade intelectual, garantia e responsabilidade (ressalva ao CDC), lei brasileira, contato.
- **Links dentro do app:** Menu → "Política de privacidade" e "Termos de uso" abrem no navegador do sistema, no idioma do jogo.
- **Hospedagem:** GitHub Pages (pasta `/docs`).

### Respostas sugeridas para "Segurança dos dados" (Play Console)
- Coleta ou compartilha dados: **Sim** (SDK de anúncios). Criptografados em trânsito: **Sim**. Exclusão: sem dados em servidor; desinstalar apaga o save.
- Tipos de dados, coletados e compartilhados para **Publicidade/marketing**, **Análise** e **Prevenção de fraudes/segurança**:
  - Identificadores do dispositivo (ID de publicidade);
  - Local aproximado;
  - Atividade no app → interações com o app;
  - Informações e desempenho do app → falhas e diagnóstico.
- Coleta **obrigatória** enquanto houver anúncios (consentimento gerido pelo UMP).

## 5. Classificação e público (respostas sugeridas)
- **IARC:**
  - violência de fantasia/cartoon sem sangue;
  - sem conteúdo sexual, linguagem imprópria, drogas, apostas ou jogos de azar com dinheiro;
  - sem interação entre usuários, sem compartilhamento de localização, sem compras digitais.
  - Esperado: Livre/10+ / PEGI 7 / ESRB E10+.
- **Público-alvo:** 13–15, 16–17, 18+. Não marcar faixas < 13. Não destinado a crianças (fora do programa Famílias).
- **Anúncios:** Sim.
- **ID de publicidade:** Sim, para publicidade.
- **Acesso ao app:** tudo disponível sem login.
- **App de notícias / governo / financeiro / saúde:** Não.
- **Mecânicas de sorte:** drops aleatórios (relíquias, inimigos Dourados) só com moeda do jogo; **nenhuma loot box paga**.

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
- **Testes:** 76 testes automatizados (Vitest) cobrindo:
  - fórmulas, save/migração e offline;
  - política de anúncios e fluxo do premiado;
  - i18n (as mesmas chaves nos 3 idiomas);
  - conteúdo.
  - CI (`ci.yml`) roda testes + build a cada push.

## 9. Pontos de atenção para o revisor
1. **Falha do UMP (`src/ads/AdMobAdService.ts`):** se a consulta de consentimento der erro, o código hoje libera anúncios (`canRequestAds = true`). Alternativa mais conservadora: não carregar anúncios quando o UMP falhar. A mudança é pequena, mas exige gerar um AAB novo.
2. **Pedido de notificação:** a permissão de notificação é pedida já na 1ª abertura (a opção vem ligada por padrão). Alternativa: pedir só quando o jogador ligar no Menu ou depois do primeiro uso do baú offline.
3. **Package ID** contém "idleknight" (nome antigo do projeto); não muda após publicar.
4. **Publicações ainda pendentes:**
   - GitHub Pages da política/termos;
   - `app-ads.txt` na raiz de `fefaofefao.github.io`;
   - mensagens GDPR e "estados dos EUA" no AdMob;
   - classificação T no AdMob.
5. **Conta pessoal nova:** teste fechado com 12+ testadores por 14 dias antes da produção.

## 10. Onde está cada coisa
- `PUBLICAR.md`: checklist do dono (contas, burocracia, ordem dos passos)
- `SETUP_CONTAS.md`: passo a passo detalhado (keystore, AdMob, Secrets, Play Console, formulários)
- `docs/`: site (política, termos, início)
- `store-listing/`: textos, notas, gráficos e capturas
- `src/ads/`: anúncios (AdService, AdMobAdService, AdPolicy)
- `android/`: projeto nativo; `.github/workflows/`: CI, APK de teste, AAB de release
