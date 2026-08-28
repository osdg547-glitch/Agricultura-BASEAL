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
├── produtos/                  # série de preço de todos os produtos, em uma página
├── panoramas/                 # arquivo de comentários mensais
├── dados/                     # exports em JSON e CSV
│   └── fontes/                # planilhas de origem, para conferência
├── scripts/                   # importação de dados e versionamento de assets
└── docs/
    ├── BRIEFING.md            # contexto do projeto (leia primeiro)
    ├── sistema-visual.md      # tokens e regras de design
    └── dados-precos-se.md     # séries de preço de Aracaju, cobertura e ressalvas
```

## Séries de preço

`dados/series-precos-se-2026.json` é a série de referência do preço interno: 54
produtos em três canais dos boletins EMDAGRO/ASPLAN de Aracaju — atacado CEASA-SE
com 48 coletas de janeiro a julho de 2026, mais dois pontos de varejo com 23
coletas no primeiro trimestre. É o arquivo que a página `/produtos/` lê.
Regeneração a partir das fontes:

```bash
pip install openpyxl
python3 scripts/importar-series-precos.py
```

Cobertura, unidades, ressalvas metodológicas e o erro de publicação de junho estão
em `docs/dados-precos-se.md`. Leia antes de publicar qualquer número da série.

## A página de produtos

`/produtos/` é uma página só para as 54 séries. O leitor escolhe em dois estágios:
primeiro o produto, depois quais canais entram no gráfico. Tudo que aparece na tela
— cartões, estatísticas, rótulo do gráfico, nota de unidade, cobertura na meta
strip — é calculado a partir do JSON pelo `assets/js/series-precos.js`. Atualizar a
série não pede reescrever a página, e a escolha vive na barra de endereço
(`/produtos/?p=tomate&c=atacado,mercado-central`), de modo que um link para uma
série específica continua sendo compartilhável.

## Uso local

Por ser estático puro, qualquer servidor HTTP simples serve:

```bash
# Python 3
python3 -m http.server 8080

# Node
npx serve .
```

Acesse `http://localhost:8080`.

## Depois de mexer em CSS ou JS

Sem etapa de build, o navegador e o CDN do GitHub Pages seguram a versão antiga
do `cobweb.css` por horas depois do deploy, e uma página nova com CSS velho
quebra em silêncio. Os links dos assets locais carregam uma versão no endereço;
para renová-la:

```bash
python3 scripts/versionar-assets.py
```

O script carimba a data de hoje em todas as páginas. Rode antes do commit sempre
que alterar `cobweb.css` ou qualquer arquivo de `assets/js/`.

## Deploy

Recomendado: **GitHub Pages** (grátis, integra com o repositório) ou **Cloudflare Pages** (CDN global, build rápido).

GitHub Pages: configurar em Settings → Pages → Source: main / root. URL fica em `<usuario>.github.io/cobweb`. Para domínio próprio, criar `CNAME` na raiz.

## Próximos passos sugeridos

Veja `docs/BRIEFING.md` para o contexto completo do projeto. Em ordem de prioridade:

1. Decidir e migrar para um gerador estático (Eleventy ou Astro)
2. Estabelecer o pipeline de dados a partir do PROHORT
3. Criar templates de página de produto e de panorama mensal
4. Versão mobile refinada (auditoria atual)
5. Explicação do índice na nota metodológica, que abre em janela a partir da meta strip

## Identidade visual

Tipografia: Source Serif 4 + Inter (Google Fonts).
Paleta principal: verde-marca `#1d9e75`, vermelho-terra `#993c1d` para variações negativas.
Logo: espiral concêntrica representando o modelo da teia.

Documentação completa em `docs/sistema-visual.md`.

## Licença

- **Código**: MIT
- **Conteúdo editorial**: CC BY-SA 4.0
