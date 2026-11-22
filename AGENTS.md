# Design do site

Ao alterar uma página, confira `DESIGN.md` e o componente equivalente no site. Use o bloco `.cite.brush` da página inicial como referência para resumos e citações. Use `.sticker` para figuras e os botões com fita do cabeçalho como referência para ações em destaque.

Na página de Eletrolisadores, o resumo aberto de cada artigo usa `.article-brief.brush` com o recorte azul-marinho do site. O texto vai sobre a pincelada com contraste alto. Figuras públicas ficam em adesivos ampliáveis, e a ação de copiar citação aparece junto aos dados publicados. Preserve os avisos de sigilo. O botão Resumo / Summary reutiliza `.act.solid` e indica quando o painel está aberto.

Antes de publicar uma mudança visual, rode `npm run build` e `npm run check:design`. Abra pelo menos um artigo publicado e um em sigilo em português e inglês. Confira a pincelada, a legibilidade nas bordas, a figura e a ação de copiar em desktop e em celular. O GitHub Actions também roda a verificação estrutural antes do deploy.
