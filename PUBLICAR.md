# PUBLICAR — o que está pronto e o que falta do seu lado

Resumo para levar o **Savior Boy: Idle Monsters** à Google Play. O passo a passo detalhado de cada item está em [SETUP_CONTAS.md](SETUP_CONTAS.md).

## ✅ Pronto no projeto

| Item | Onde |
|---|---|
| Jogo completo em 3 idiomas (pt-BR, en, es) | `src/` |
| Projeto Android (Capacitor 8, targetSdk 36, minSdk 24, retrato, ícone adaptativo, splash) | `android/` |
| AdMob: premiados + intersticial com limite, consentimento UMP (falha não libera anúncios), anúncios **não personalizados** para todos (`npa`), classificação **PG**, botão "Privacidade e anúncios" no Menu | `src/ads/` |
| Notificação **opt-in** (não pede permissão ao abrir) | `src/App.ts` |
| Checagem automática de **páginas de 16 KB** no release; `versionCode` = run + 100 | `android-release.yml`, `scripts/check-16kb.py` |
| IDs reais só por GitHub Secrets (sem eles, usa IDs de teste do Google) | `.github/workflows/` |
| AAB assinado gerado no GitHub Actions ao criar uma tag `v*`; envio opcional para teste interno | `android-release.yml` |
| APK de teste a cada push | `android-apk.yml` |
| Versão **1.0.0** (`versionCode` = número do run + 100, sempre crescente) | `package.json`, `android-release.yml` |
| Site com **Política de Privacidade** e **Termos de Uso** em pt/en/es, já linkados no Menu do jogo | `docs/` |
| Textos da ficha da loja (título, descrição curta e longa) em 3 idiomas | `store-listing/*.md` |
| Notas da versão 1.0.0 em 3 idiomas | `store-listing/release-notes.md` |
| Ícone 512×512, gráfico de destaque 1024×500 e 8 capturas 1080×1920 por idioma | `store-listing/graphics/`, `store-listing/screenshots/` |
| Respostas sugeridas: classificação de conteúdo, público-alvo, Segurança dos dados, declarações | `SETUP_CONTAS.md` §5–6 |
| `app-ads.txt` + página inicial para o repositório `fefaofefao.github.io` | `user-site/` |
| Licenças e créditos (KayKit CC0, Fredoka OFL) | `CREDITS.md`, `licenses/` |

## ⏳ To-do do dono (em ordem)

### 1. Revisar e decidir
- [x] Responsável na política e nos termos: **"Fernando Martins Sampaio (FSamp Labs)"** + e-mail de contato (sem CPF)
- [ ] Revisar a branch `claude/play-compliance` e fazer o merge na branch usada para o Pages/release

- [x] **Repositório renomeado** para `Savior-Boy-Idle-Monsters` (Settings → General → Repository name). Os links do site, do jogo e da documentação já usam o nome novo.

### 2. Conta Google Play (burocracia)
- [ ] Verificação de identidade da conta de desenvolvedor (documento + selfie) — *aguardando o Google*
- [ ] Verificar o **telefone** e o **e-mail de contato** da conta
- [ ] Verificar o **acesso a um aparelho Android** (app **Google Play Console** no celular)
- [ ] Nome do desenvolvedor público: **FSamp Labs**; e-mail público: `fefaofefao@gmail.com`

### 3. Sites (obrigatório antes de preencher a Play)
- [ ] **Settings → Pages → Deploy from a branch** → a branch com o merge, pasta **`/docs`** → Save
- [ ] Conferir `https://fefaofefao.github.io/Savior-Boy-Idle-Monsters/privacy-policy/` e `/terms/`
- [ ] Criar o repositório público **`fefaofefao.github.io`**, copiar o conteúdo de **`user-site/`** (app-ads.txt + index.html) para a raiz e ativar o Pages (`main` / root). Conferir `https://fefaofefao.github.io/app-ads.txt` (passo a passo em `user-site/README.md`)

### 4. AdMob
- [x] App e blocos Premiado e Intersticial criados; IDs nos GitHub Secrets
- [ ] **Configurações do app → classificação máxima de conteúdo do anúncio = PG** (igual ao código)
- [ ] **Privacidade e mensagens → GDPR:** criar e **publicar** a mensagem de consentimento
- [ ] **Privacidade e mensagens → Regulamentações estaduais dos EUA:** criar e publicar
- [ ] **Pagamentos:** endereço, informações fiscais dos EUA (W-8BEN, pessoa física não residente) e conta bancária
- [ ] PIN de endereço (carta) quando o saldo chegar a ~US$ 10
- [ ] Imposto no Brasil sobre a receita do exterior: confirmar com um contador

### 5. AAB
- [x] Keystore de upload gerada e secrets cadastrados
- [ ] Baixar o **AAB** `SaviorBoyIdleMonsters-AAB-1.0.0-107` (versionCode 107, package `br.com.fsamplabs.saviorboy`) em https://github.com/fefaofefao/Savior-Boy-Idle-Monsters/actions/runs/37532520104 → Artifacts. **Não** use AABs anteriores (package antigo).
- [ ] Guardar a keystore + senha em **2 lugares seguros**

### 6. Play Console: criar o app e "Conteúdo do app"
- [ ] Criar app: *Savior Boy: Idle Monsters*, idioma padrão pt-BR, **Jogo**, **Gratuito**
- [ ] Política de privacidade: URL do item 3
- [ ] Acesso ao app: tudo sem login · Anúncios: **Sim** · ID de publicidade: **Sim (publicidade, não personalizada)**
- [ ] Classificação de conteúdo (IARC) com as respostas da CONFORMIDADE §5
- [ ] Público-alvo: **13–15, 16–17, 18+**; não destinado a crianças
- [ ] Segurança dos dados: respostas da CONFORMIDADE §4 (mesmos tipos; publicidade não personalizada)
- [ ] Apps governamentais / financeiros / saúde / notícias: **Não**
- [ ] Contato: `fefaofefao@gmail.com`; site `https://fefaofefao.github.io`

### 7. Ficha da loja (`store-listing/`)
- [ ] Textos pt-BR, en-US, es-ES e es-419; ícone, gráfico de destaque e 8 capturas por idioma
- [ ] Notas da versão 1.0.0 (`store-listing/release-notes.md`)

### 8. Teste fechado (conta pessoal nova)
- [ ] Faixa **Teste fechado** → enviar o AAB → aceitar o **Play App Signing**
- [ ] 12+ testadores inscritos por **14 dias seguidos**; testar em Android 15/16 o botão voltar, a tela de notificação do baú e os anúncios
- [ ] Ver o **relatório de pré-lançamento** da Play (inclui compatibilidade com 16 KB)

### 9. Produção
- [ ] Solicitar acesso à produção e responder o questionário
- [ ] Promover o AAB, lançamento gradual, enviar para revisão
- [ ] Publicado: vincular o app no AdMob e conferir o app-ads.txt

## Depois do lançamento (opcional)
- Vídeo de 30 s no YouTube para a ficha da loja.
- "Remover anúncios" com Play Billing (`ENABLE_IAP` em `src/config/app.ts`; plugin sugerido no `DECISIONS.md`).
- Acompanhar falhas e ANRs no Play Console (Android vitals) e a receita no AdMob.
