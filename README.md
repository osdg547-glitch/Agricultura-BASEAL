# cobweb

Portal editorial de preços agricolas com foco em hortifrúti em Sergipe.

## Sobre

Site estático que publica mensalmente um índice de preços do hortifrúti em Aracaju (CEASA-SE), comparado com Recife (CEASA-PE) e São Paulo (CEAGESP), acompanhado de comentário de conjuntura e fichas individuais por produto. Além disso, dá uma panorama do mercado internacional, os preços negociados em diversos países e os principais portos de exportação nascional. Analisa o desepenho de outro países que atuam no setor, contribuindo para a estrategia dos produtores nacionais. 

Fonte primária: PROHORT/CONAB para os preços do ceasas. Comex e sites internacionais para analíse internacional. 

## Estrutura

```
cobweb/
├── index.html                 # home com índice geral
├── assets/
│   ├── css/cobweb.css         # sistema de design completo
│   ├── js/indice-geral.js     # gráfico do índice
│   └── img/                   # logo e favicon (SVG)
├── produtos/                  # fichas individuais por produto
├── panoramas/                 # arquivo de comentários mensais
├── dados/                     # exports em JSON e CSV
└── docs/
    ├── BRIEFING.md            # contexto do projeto (leia primeiro)
    └── sistema-visual.md      # tokens e regras de design
```

## Uso local

Por ser estático puro, qualquer servidor HTTP simples serve:

```bash
# Python 3
python3 -m http.server 8080

# Node
npx serve .
```

Acesse `http://localhost:8080`.

## Deploy

Recomendado: **GitHub Pages** (grátis, integra com o repositório) ou **Cloudflare Pages** (CDN global, build rápido).

GitHub Pages: configurar em Settings → Pages → Source: main / root. URL fica em `<usuario>.github.io/cobweb`. Para domínio próprio, criar `CNAME` na raiz.

## Próximos passos sugeridos

Veja `docs/BRIEFING.md` para o contexto completo do projeto. Em ordem de prioridade:

1. Decidir e migrar para um gerador estático (Eleventy ou Astro)
2. Estabelecer o pipeline de dados a partir do PROHORT
3. Criar templates de página de produto e de panorama mensal
4. Versão mobile refinada (auditoria atual)
5. Página `/sobre/metodologia/` com a explicação do índice

## Identidade visual

Tipografia: Source Serif 4 + Inter (Google Fonts).
Paleta principal: verde-marca `#1d9e75`, vermelho-terra `#993c1d` para variações negativas.
Logo: espiral concêntrica representando o modelo da teia.

Documentação completa em `docs/sistema-visual.md`.

## Licença

- **Código**: MIT
- **Conteúdo editorial**: CC BY-SA 4.0
