# PUBLICAR — o que está pronto e o que falta do seu lado

Resumo para levar o **King Idle Savior Boy** à Google Play. O passo a passo detalhado de cada item está em [SETUP_CONTAS.md](SETUP_CONTAS.md).

## ✅ Pronto no projeto

| Item | Onde |
|---|---|
| Jogo completo em 3 idiomas (pt-BR, en, es) | `src/` |
| Projeto Android (Capacitor 8, targetSdk 36, minSdk 24, retrato, ícone adaptativo, splash) | `android/` |
| AdMob: premiados + intersticial com limite, consentimento UMP, botão "Privacidade e anúncios" no Menu, conteúdo T | `src/ads/` |
| IDs reais só por GitHub Secrets (sem eles, usa IDs de teste do Google) | `.github/workflows/` |
| AAB assinado gerado no GitHub Actions ao criar uma tag `v*`; envio opcional para teste interno | `android-release.yml` |
| APK de teste a cada push | `android-apk.yml` |
| Versão **1.0.0** (`versionCode` sobe sozinho a cada build de release) | `package.json` |
| Site com **Política de Privacidade** e **Termos de Uso** em pt/en/es, já linkados no Menu do jogo | `docs/` |
| Textos da ficha da loja (título, descrição curta e longa) em 3 idiomas | `store-listing/*.md` |
| Notas da versão 1.0.0 em 3 idiomas | `store-listing/release-notes.md` |
| Ícone 512×512, gráfico de destaque 1024×500 e 8 capturas 1080×1920 por idioma | `store-listing/graphics/`, `store-listing/screenshots/` |
| Respostas sugeridas: classificação de conteúdo, público-alvo, Segurança dos dados, declarações | `SETUP_CONTAS.md` §5–6 |
| `app-ads.txt` modelo | `app-ads.txt` |
| Licenças e créditos (KayKit CC0, Fredoka OFL) | `CREDITS.md`, `licenses/` |

## ⏳ To-do do dono (em ordem)

### A. Conta Google Play (burocracia)
- [ ] Verificação de identidade da conta de desenvolvedor (documento + selfie) — *aguardando o Google*
- [ ] Verificar o **telefone** e o **e-mail de contato** da conta (Play Console pede um código)
- [ ] Verificar o **acesso a um aparelho Android**: instalar o app **Google Play Console** no celular e entrar com a mesma conta
- [ ] Nome do desenvolvedor público: **FSamp Labs**; e-mail público: `fefaofefao@gmail.com`
- [ ] (Só se um dia vender algo no app) Perfil de pagamentos/comerciante — **não** é necessário para um app gratuito com anúncios

### B. Site da política de privacidade (obrigatório)
- [ ] GitHub → **Settings → Pages → Deploy from a branch** → branch `claude/youthful-hamilton-rx1ww2` (ou `main`, depois do merge), pasta **`/docs`** → Save
- [ ] Abrir e conferir (1–2 min depois): `https://fefaofefao.github.io/King-Idle-Savior-Boy/privacy-policy/`
- [ ] **app-ads.txt:** criar o repositório **`fefaofefao.github.io`** (público), enviar o arquivo `app-ads.txt` deste projeto para a raiz e ativar o Pages nele (branch `main`, `/root`). Conferir `https://fefaofefao.github.io/app-ads.txt`

### C. AdMob (burocracia e anúncios)
- [x] App e blocos Premiado e Intersticial criados; IDs nos GitHub Secrets
- [ ] **Privacidade e mensagens → GDPR:** criar e **publicar** a mensagem de consentimento (sem ela, quem está na Europa não vê anúncios)
- [ ] **Privacidade e mensagens → Regulamentações estaduais dos EUA:** criar e publicar (recomendado)
- [ ] **Configurações do app:** classificação máxima de conteúdo do anúncio = **T**
- [ ] **Pagamentos:** preencher endereço, **informações fiscais dos EUA** (formulário W-8BEN, como pessoa física não residente; usar CPF como TIN estrangeiro) e conta bancária. Os pagamentos saem quando o saldo passa do limite mínimo (cerca de US$ 100)
- [ ] **PIN de endereço:** quando o saldo chegar a ~US$ 10, o Google envia uma carta com um PIN pelo correio; digitar no AdMob
- [ ] Depois do app publicado: **Apps → Configurações → Vincular a uma app store** e conferir o **app-ads.txt** (até 24 h)
- [ ] Imposto no Brasil: a receita do AdMob é rendimento do exterior (carnê-leão / declaração anual). Confirme com um contador

### D. AAB (arquivo do app)
- [x] Keystore de upload gerada
- [x] Secrets da keystore cadastrados
- [x] AAB 1.0.0 **assinado**: `KingIdleSaviorBoy-AAB-1.0.0-4` (versionCode 4) em https://github.com/fefaofefao/King-Idle-Savior-Boy/actions/runs/37244728314 → Artifacts (o arquivo fica disponível por 90 dias; baixe e guarde)
- [ ] Guardar a keystore + senha em **2 lugares seguros** (ex.: Drive privado + pendrive)

### E. Play Console — criar o app e preencher "Conteúdo do app"
- [ ] **Criar app:** nome *King Idle Savior Boy*, idioma padrão Português (Brasil), **Jogo**, **Gratuito**, aceitar as declarações
- [ ] **Política de privacidade:** URL do item B
- [ ] **Acesso ao app:** todas as funções disponíveis sem restrições (sem login)
- [ ] **Anúncios:** Sim, o app contém anúncios
- [ ] **Classificação do conteúdo (IARC):** e-mail `fefaofefao@gmail.com`, categoria Jogo; violência de fantasia/cartoon sem sangue; sem conteúdo sexual, palavrões, drogas, apostas, chat ou compras (SETUP §5)
- [ ] **Público-alvo:** marcar só **13–15, 16–17 e 18+**; "não é destinado a crianças"
- [ ] **Segurança dos dados:** respostas do SETUP §6 (coleta pelo SDK de anúncios: ID de publicidade, local aproximado, interações, diagnóstico; criptografado em trânsito)
- [ ] **ID de publicidade:** Sim, usado para publicidade
- [ ] **Apps governamentais / recursos financeiros / saúde / notícias:** Não
- [ ] **Categoria e tags:** Jogos → RPG (ou Casual); tags Idle, RPG, Clicker, Fantasia, Offline
- [ ] **Detalhes de contato:** e-mail `fefaofefao@gmail.com`, site `https://fefaofefao.github.io/King-Idle-Savior-Boy/`

### F. Ficha da loja (tudo pronto em `store-listing/`)
- [ ] Textos pt-BR (`pt-BR.md`); em "Traduções" adicionar **en-US** (`en.md`), **es-ES** e **es-419** (`es.md`)
- [ ] Ícone `graphics/icon-512.png`, gráfico `graphics/feature-graphic-1024x500.png`
- [ ] Capturas de telefone: `screenshots/pt-BR`, `screenshots/en`, `screenshots/es` (8 cada)

### G. Teste fechado (obrigatório para contas pessoais novas)
- [ ] **Testar → Teste fechado → Criar faixa** → enviar o AAB → notas de `release-notes.md`
- [ ] Na 1ª versão, aceitar o **Play App Signing** (o Google guarda a chave final)
- [ ] Países: todos (ou Brasil + os que quiser)
- [ ] Lista de **12+ testadores** (e-mails Gmail) → compartilhar o link de inscrição
- [ ] Cada testador aceita o convite, instala e abre o jogo algumas vezes; ficam inscritos **14 dias seguidos**
- [ ] Responder o feedback/relatório de pré-lançamento se o Google apontar algo

### H. Produção
- [ ] Após os 14 dias: **Painel → Solicitar acesso à produção** e responder o questionário sobre o teste (como recrutou testadores, o que mudou com o feedback)
- [ ] Aprovado: **Produção → Criar versão** → promover o mesmo AAB (ou um novo, se mudou algo), lançamento **gradual** (ex.: 20%) → Enviar para revisão
- [ ] Revisão do Google: de algumas horas a alguns dias
- [ ] Publicado: vincular no AdMob (item C) e acompanhar Android vitals (falhas/ANR)

## Depois do lançamento (opcional)
- Vídeo de 30 s no YouTube para a ficha da loja.
- "Remover anúncios" com Play Billing (`ENABLE_IAP` em `src/config/app.ts`; plugin sugerido no `DECISIONS.md`).
- Acompanhar falhas e ANRs no Play Console (Android vitals) e a receita no AdMob.
