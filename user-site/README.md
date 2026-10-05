# user-site/ — conteúdo do repositório `fefaofefao.github.io`

Estes arquivos **não** são publicados por este repositório. Eles vão para um repositório separado chamado
**`fefaofefao.github.io`** (GitHub Pages de usuário), porque o AdMob só aceita o `app-ads.txt` na **raiz do domínio**
informado como "Site do desenvolvedor" na ficha da Google Play.

| Arquivo | Endereço final |
|---|---|
| `app-ads.txt` | `https://fefaofefao.github.io/app-ads.txt` |
| `index.html` | `https://fefaofefao.github.io/` (link para o site do jogo) |

## Como publicar (dono do projeto)
1. Crie um repositório **público** chamado exatamente `fefaofefao.github.io`.
2. Envie `app-ads.txt` e `index.html` para a **raiz** dele (branch `main`).
3. **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.
4. Confira `https://fefaofefao.github.io/app-ads.txt` no navegador (deve mostrar a linha do Google).
5. Na ficha da Play, use `https://fefaofefao.github.io` no campo **Site**.
6. No AdMob, **Apps → app-ads.txt** confirma o arquivo em até 24 h (depois que o app estiver publicado e vinculado).

A linha do `app-ads.txt` contém o Publisher ID público da conta AdMob (`pub-7483085200976329`); não é segredo.
