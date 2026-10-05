# SETUP_CONTAS — passo a passo do dono do projeto

Este guia cobre só o que depende das **suas contas**: AdMob, Google Play, keystore e GitHub Secrets.
O resto o projeto já faz sozinho. Faça na ordem.

> Regras de ouro
> - **Nunca** coloque IDs reais, senhas ou a keystore no código ou em commits. Tudo vai em **GitHub Secrets**.
> - O **Package ID `br.com.fernando.idleknight` não pode mudar** depois da 1ª publicação.
> - Políticas e prazos da Play mudam. Onde houver número (testadores, dias, API), **confirme na tela do Play Console**.

---

## 1. Keystore (assinatura do app)

1. Instale o Java (JDK 17 ou mais novo) e rode, numa pasta **fora** do repositório:
   ```bash
   keytool -genkeypair -v -keystore idleknight-upload.jks -alias idleknight \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
   Escolha uma senha forte e anote o **alias** (`idleknight`) e as senhas.
2. **Guarde a keystore em 2 lugares seguros** (ex.: gerenciador de senhas + pendrive/nuvem privada).
   ⚠️ **Perder a keystore = não conseguir mais atualizar o app.** Para se proteger, use o **Play App Signing** (passo 4.4): o Google guarda a chave de assinatura final e a sua vira só uma "chave de upload", que pode ser trocada se você a perder.
3. Converta para base64 (para o GitHub Secret):
   ```bash
   base64 -w0 idleknight-upload.jks > keystore.b64      # Linux
   base64 -i idleknight-upload.jks -o keystore.b64      # macOS
   ```

## 2. AdMob

1. Entre em <https://admob.google.com> com a mesma conta Google que vai usar na Play.
2. **Apps → Adicionar app** → Android → "O app ainda não está publicado" (você vincula à Play depois) → nome "King Idle Savior Boy".
3. Copie o **App ID** (formato `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`).
4. **Blocos de anúncios → Adicionar bloco:**
   - **Premiado (Rewarded)**: nome "rewarded_main". Recompensa: 1 item "bonus". Copie o ID (`ca-app-pub-…/…`).
   - **Intersticial**: nome "interstitial_rebirth". Copie o ID.
   - **Não** crie banner (o jogo não usa).
5. **Privacidade e mensagens → GDPR:** crie uma mensagem de consentimento (UMP) para o app e publique. Faça o mesmo para "Regulamentações estaduais dos EUA" se quiser atender esses estados. O jogo já chama o UMP antes de carregar anúncios, e o botão "Privacidade e anúncios" no Menu reabre o formulário.
6. **Configurações do app → Classificação máxima de conteúdo do anúncio:** **PG**. O código também envia `maxAdContentRating: ParentalGuidance` e pede anúncios **não personalizados** (`npa`) para todos.
7. **app-ads.txt:** veja a seção 7.

Enquanto os IDs reais não estiverem nos Secrets, o build usa automaticamente os **IDs de teste oficiais do Google** (anúncios de teste, sem receita e sem risco para a conta).

## 3. GitHub Secrets

No GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Crie:

| Secret | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | conteúdo de `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | senha da keystore |
| `ANDROID_KEY_ALIAS` | `idleknight` (ou o alias que você escolheu) |
| `ANDROID_KEY_PASSWORD` | senha da chave |
| `ADMOB_APP_ID` | App ID do AdMob (`ca-app-pub-…~…`) |
| `ADMOB_REWARDED_ID` | ID do bloco premiado (`ca-app-pub-…/…`) |
| `ADMOB_INTERSTITIAL_ID` | ID do bloco intersticial |
| `PLAY_SERVICE_ACCOUNT_JSON` | *(opcional, passo 8)* JSON da service account |

**Gerar o AAB:** crie uma tag (`git tag v1.0.0 && git push origin v1.0.0`) ou rode o workflow manualmente em **Actions → Android Release (AAB) → Run workflow**. O arquivo `app-release.aab` aparece em **Artifacts** no fim da execução.

## 4. Play Console

1. Crie a conta de desenvolvedor em <https://play.google.com/console> (taxa única). Contas pessoais exigem verificação de identidade. **Nome do desenvolvedor** (aparece na loja): **FSamp Labs**.
2. **Criar app:** nome "King Idle Savior Boy", idioma padrão pt-BR, **Jogo**, **Gratuito**.
3. **Configurar o app** (painel "Configure seu app"): preencha cada item conforme as seções 5 e 6.
4. **Play App Signing:** na 1ª versão enviada, aceite "Deixar o Google gerenciar e proteger a chave de assinatura do app". O AAB enviado é assinado com a sua **chave de upload** (a keystore do passo 1).
5. **Ficha da loja:** textos em `store-listing/pt-BR.md`, `en.md` e `es.md` (adicione os idiomas en-US, es-ES e es-419 em "Traduções"). Ícone: `store-listing/graphics/icon-512.png`. Gráfico de destaque: `store-listing/graphics/feature-graphic-1024x500.png`. Capturas: `store-listing/screenshots/<idioma>/` (8 por idioma). Notas da versão: `store-listing/release-notes.md`.
   - Categoria: **Jogos → RPG** (ou Casual). Tags sugeridas: Idle, RPG, Clicker, Fantasia, Single player, Offline.
   - E-mail de contato (obrigatório e público na loja) e o Site do passo 7.
6. **Política de privacidade:** URL do GitHub Pages (seção 7).
7. **Anúncios:** marque "Sim, meu app contém anúncios".

## 5. Classificação de conteúdo e público-alvo

- **Classificação de conteúdo (questionário IARC):** categoria **Jogo**. Violência: **fantasia/cartoon, sem sangue** (esqueletos estilizados). Sem conteúdo sexual, linguagem imprópria, drogas ou apostas. Sem chat nem interação entre usuários. Sem compras no app (por enquanto). O resultado esperado é algo como **Livre/10+ / PEGI 7 / ESRB E10+**, conforme o país.
- **Outras declarações do "Conteúdo do app":** Anúncios = **Sim**; ID de publicidade = **Sim, para publicidade** (o SDK do AdMob usa a permissão `AD_ID`); Acesso ao app = **todas as funções disponíveis sem login**; App de notícias / governo / financeiro / saúde = **Não**.
- **Público-alvo e conteúdo:** selecione **apenas 13–15, 16–17 e 18+**. **Não** marque faixas abaixo de 13 anos. Responda que o app **não** foi feito para atrair crianças. Isso mantém o app fora do programa "Famílias" e das restrições de anúncios que vêm com ele (o código já usa `tagForChildDirectedTreatment: false`).

## 6. Formulário de Segurança dos dados (sugestão)

O jogo em si não coleta dados: o save fica só no aparelho. Quem coleta dados é o **SDK do Google Mobile Ads (AdMob) + UMP**. Respostas sugeridas (revise com a documentação atual do Google, que lista o que o SDK coleta):

- **O app coleta ou compartilha dados?** Sim (por causa do SDK de anúncios).
- **Os dados são criptografados em trânsito?** Sim.
- **O usuário pode pedir a exclusão dos dados?** O jogo não guarda dados em servidor. Explique que desinstalar remove o save local; os dados de anúncios seguem a política do Google.
- **Backup do Android:** o save local pode entrar no backup pessoal do usuário (Google). Isso não é coleta pelo desenvolvedor e não precisa ser declarado.
- **Tipos de dados** (coletados e compartilhados, para **Publicidade ou marketing**, **Análise** e **Prevenção de fraudes, segurança e conformidade**):
  - **Identificadores do dispositivo ou outros IDs** (ID de publicidade).
  - **Local aproximado** (derivado do IP).
  - **Atividade no app → Interações com o app** (impressões e cliques em anúncios).
  - **Informações e desempenho do app → Registros de falhas e Diagnóstico.**
- A coleta é **obrigatória** (não opcional) enquanto houver anúncios; o consentimento é gerido pelo UMP.

## 7. Site, política de privacidade, termos e app-ads.txt (GitHub Pages)

O site já está pronto na pasta `docs/` (página inicial, **Política de Privacidade** e **Termos de Uso**, cada um em pt/en/es).

1. Faça o merge deste trabalho na branch padrão (`main`).
2. No GitHub: **Settings → Pages → Build and deployment → Deploy from a branch** → branch `main`, pasta **`/docs`** → Save.
3. Em 1–2 minutos o site fica em:
   - `https://fefaofefao.github.io/King-Idle-Savior-Boy/` (início)
   - `https://fefaofefao.github.io/King-Idle-Savior-Boy/privacy-policy/` ← **URL da política para a Play**
   - `https://fefaofefao.github.io/King-Idle-Savior-Boy/terms/`
   O jogo já abre esses links no Menu (no idioma do jogador). Se o endereço for outro, ajuste `SITE_URL` em `src/ui/Panel.ts`.
4. E-mail de contato já preenchido: `fefaofefao@gmail.com` (use o mesmo na ficha da Play).
5. **app-ads.txt:** precisa ficar na **raiz** do domínio informado como "Site" na ficha da Play.
   - Crie um repositório chamado **`fefaofefao.github.io`** (GitHub Pages de usuário), coloque nele o `app-ads.txt` deste projeto (já com o Publisher ID `pub-7483085200976329`) e ative o Pages.
   - Ele ficará em `https://fefaofefao.github.io/app-ads.txt`. Informe `https://fefaofefao.github.io` no campo **Site** da ficha da Play.
   - O AdMob verifica o arquivo em até 24 h (AdMob → Apps → app-ads.txt).

## 8. (Opcional) Envio automático para teste interno

1. Play Console → **Configurações → Acesso à API** → vincule um projeto do Google Cloud.
2. No Google Cloud, crie uma **service account** e gere uma chave JSON.
3. No Play Console → **Usuários e permissões**, convide o e-mail da service account com permissão de **lançar versões** no app.
4. Cole o JSON inteiro no secret `PLAY_SERVICE_ACCOUNT_JSON`. A partir daí o workflow envia cada AAB para a faixa **Teste interno**. Sem o secret, essa etapa é pulada.
   - A **primeira** versão precisa ser enviada manualmente pelo Play Console.

## 9. Teste fechado obrigatório (contas pessoais novas)

Contas pessoais criadas depois de nov./2023 precisam de um **teste fechado com pelo menos 12 testadores, que fiquem inscritos por pelo menos 14 dias seguidos**, antes de pedir acesso à produção. *(Na última revisão eram 12 testadores e 14 dias; confira o número exibido no Play Console.)*

1. **Testar → Teste fechado → Criar faixa** → envie o AAB.
2. Crie uma lista de e-mails (Grupo do Google ou lista de testadores) com 12 ou mais pessoas.
3. Compartilhe o link de inscrição. Peça para cada pessoa **aceitar o convite, instalar e abrir o jogo** algumas vezes durante as duas semanas.
4. Após os 14 dias: **Painel → Solicitar acesso à produção** e responda o questionário sobre o teste.

## 10. Produção

1. Gere uma nova versão (nova tag `vX.Y.Z`; o `versionCode` sobe sozinho).
2. **Produção → Criar nova versão** → envie o AAB → notas da versão (pt-BR/en/es).
3. Países: todos (ou os que quiser). Comece com **lançamento gradual** (ex.: 20%).
4. Envie para revisão. A 1ª revisão pode levar alguns dias.
5. Depois de publicado, vincule o app no **AdMob → Configurações do app → Vincular a uma app store**.

## Checklist final

- [ ] Keystore criada e guardada em 2 lugares
- [ ] App + blocos de anúncio no AdMob, mensagem UMP publicada, classificação PG
- [ ] 7 GitHub Secrets cadastrados (+1 opcional)
- [ ] Workflow gerou um AAB assinado
- [ ] Política de privacidade publicada (e-mail trocado) e URL na ficha
- [ ] app-ads.txt na raiz do site do desenvolvedor
- [ ] Classificação de conteúdo + público 13+ + Segurança dos dados
- [ ] Teste fechado (12 testadores × 14 dias) concluído
- [ ] Produção
