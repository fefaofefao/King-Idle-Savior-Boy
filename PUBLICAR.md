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

## ⏳ Falta do seu lado (em ordem)

1. **Decidir o Package ID agora.** Hoje é `br.com.fernando.idleknight`. Depois da 1ª publicação **nunca mais muda**. Se quiser outro (ex.: `br.com.fernando.kingidlesaviorboy`), peça a troca antes de gerar o primeiro AAB.
2. **Testar o APK no celular** (`TESTE_APK.md`): desempenho, anúncios de teste, botão voltar, notificação.
3. **Conta de desenvolvedor Google Play** (taxa única de US$ 25 e verificação de identidade).
4. **Keystore de upload:** ✅ gerada (alias `idleknight`, PKCS12, RSA 2048) e entregue ao dono fora do repositório. Falta: guardar em 2 lugares e cadastrar os 4 secrets dela.
5. **AdMob:** ✅ app e blocos **Premiado** e **Intersticial** criados. Falta: publicar a mensagem de consentimento (GDPR/UMP) e definir a classificação **T** (SETUP §2).
6. **GitHub Secrets** (7): `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ADMOB_APP_ID`, `ADMOB_REWARDED_ID`, `ADMOB_INTERSTITIAL_ID` (SETUP §3).
7. **E-mail de contato:** trocar `CONTATO@EXEMPLO.COM` nos 3 arquivos de `docs/` (e usar o mesmo e-mail na ficha da Play).
8. **Merge na `main` e ativar o GitHub Pages** (Settings → Pages → `main` / `/docs`). Conferir se abre `https://fefaofefao.github.io/King-Idle-Savior-Boy/privacy-policy/` (SETUP §7).
9. **app-ads.txt:** ✅ já preenchido com o Publisher ID `pub-7483085200976329`. Falta: copiar para o repositório `fefaofefao.github.io`; usar `https://fefaofefao.github.io` como Site na ficha (SETUP §7).
10. ✅ Build de produção testado no Actions (`KingIdleSaviorBoy-AAB-1.0.0-1`, 11,6 MB, sem assinatura porque faltavam os secrets da keystore). **Gerar o AAB final:** `git tag v1.0.0 && git push origin v1.0.0` → Actions → baixar `KingIdleSaviorBoy-AAB-1.0.0-N`.
11. **Play Console:**
    - criar o app (Jogo, Gratuito);
    - preencher a ficha com os textos e imagens de `store-listing/`;
    - política de privacidade (URL do item 8);
    - classificação de conteúdo, público-alvo **13+**, anúncios **Sim**, ID de publicidade, Segurança dos dados (SETUP §4–6);
    - aceitar o **Play App Signing** no primeiro envio.
12. **Teste fechado obrigatório** (contas pessoais novas): pelo menos **12 testadores por 14 dias** seguidos e depois "Solicitar acesso à produção" (SETUP §9). Confira os números atuais no Play Console.
13. **Produção:** nova versão com as notas de `release-notes.md`, lançamento gradual, enviar para revisão. Depois de publicado, **vincular o app no AdMob** (SETUP §10).

## Depois do lançamento (opcional)
- Vídeo de 30 s no YouTube para a ficha da loja.
- "Remover anúncios" com Play Billing (`ENABLE_IAP` em `src/config/app.ts`; plugin sugerido no `DECISIONS.md`).
- Acompanhar falhas e ANRs no Play Console (Android vitals) e a receita no AdMob.
