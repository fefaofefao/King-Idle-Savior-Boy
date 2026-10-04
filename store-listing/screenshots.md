# Screenshots e gráficos da loja

Tudo já gerado e pronto para enviar ao Play Console:

| Arquivo | Uso no Play Console |
|---|---|
| `graphics/icon-512.png` | Ícone do app (512×512) |
| `graphics/feature-graphic-1024x500.png` | Gráfico de destaque (1024×500) |
| `screenshots/pt-BR/*.png` | Capturas de tela do telefone — Português (Brasil) |
| `screenshots/en/*.png` | Capturas de tela do telefone — English (United States) |
| `screenshots/es/*.png` | Capturas de tela do telefone — Español (España e Latinoamérica) |

Capturas: 1080×1920 (9:16), 8 por idioma, na ordem:
1. Tela inicial com escolha de idioma
2. Combate com combo
3. Rei Esqueleto furioso (chefe)
4. Criaturas (Golem Gigante no Gelo)
5. Visuais do herói
6. Guilda
7. Jornada do Rei e "Coletar tudo"
8. Renascer com a prévia de dano

## Gerar de novo (depois de mudar o visual)
```bash
npm run build && npx vite preview --port 4173 &
node scripts/store/screenshots.mjs          # precisa do Playwright
```
O gráfico de destaque vem de `scripts/store/feature-graphic.html` (abra no navegador em 1024×500 e capture, ou use o Playwright).

> Opcional (melhora a conversão): um vídeo curto de 30 s no YouTube para o campo "Vídeo" da ficha. Grave a tela do celular jogando.
