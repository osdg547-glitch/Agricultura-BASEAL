# cobweb

Portal editorial sobre os mercados do hortifrúti em Sergipe: preços, produção e exportações.

## Sobre

Site estático que reúne três leituras do hortifrúti sergipano:

- **Mercado interno**: séries de preço de 71 produtos em Aracaju, no atacado da
  CEASA-SE e no varejo do Mercado Central e do Augusto Franco, a partir do
  boletim semanal da EMDAGRO/ASPLAN (de duas a três coletas por semana).
- **Estrutura produtiva**: o que o estado planta e colhe, município a município,
  pela Produção Agrícola Municipal (PAM/IBGE).
- **Mercado externo**: o que Sergipe exporta, em valor e volume, pelo Comex Stat.

As leituras são publicadas como panoramas em formato de ensaio, uma cadeia por
vez, com série, mapa e comentário, sempre com as fontes citadas e a nota de método.

## Estrutura

```
cobweb/
├── index.html                 # home: sumário, vitrine de séries e panoramas
├── cobweb.css                 # sistema de design completo
├── assets/
│   ├── js/                    # gráficos, vitrine e página de produtos
│   └── img/                   # logo e favicon (SVG)
├── produtos/                  # série de preço de todos os produtos, em uma página
├── panoramas/                 # ensaios por cadeia (laranja, exportações)
├── servicos/                  # análise econômica sob demanda
├── sobre/                     # quem publica e com qual método
├── dados/                     # exports em JSON e CSV
│   └── fontes/                # planilhas de origem, para conferência
├── scripts/                   # importação de dados e versionamento de assets
└── docs/
    ├── BRIEFING.md            # contexto do projeto (leia primeiro)
    ├── sistema-visual.md      # tokens e regras de design
    └── dados-precos-se.md     # séries de preço de Aracaju, cobertura e ressalvas
```

## Séries de preço

`dados/series-precos-se-2026.json` é a série de referência do preço interno: 71
produtos em três canais dos boletins EMDAGRO/ASPLAN de Aracaju — atacado CEASA-SE
com 54 produtos em 48 coletas de janeiro a julho de 2026, varejo do Mercado
Central com 65 produtos em 58 coletas na mesma janela, e o Augusto Franco com 11
produtos no primeiro trimestre. É o arquivo que a página `/produtos/` lê.
Regeneração a partir das fontes:

```bash
pip install openpyxl
python3 scripts/importar-series-precos.py
```

Cobertura, unidades, ressalvas metodológicas e o erro de publicação de junho estão
em `docs/dados-precos-se.md`. Leia antes de publicar qualquer número da série.

## A página de produtos

`/produtos/` é uma página só para todas as séries. O leitor escolhe em dois
estágios: primeiro o produto, depois quais canais entram no gráfico. Dois canais
só entram no mesmo eixo quando compartilham a unidade de comparação. Tudo que aparece na tela
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
2. Criar templates de panorama, para que novas cadeias entrem sem copiar HTML
3. Versão mobile refinada (auditoria atual)

## Identidade visual

Tipografia: Source Serif 4 + Inter (Google Fonts).
Paleta principal: verde-marca `#1d9e75`, vermelho-terra `#993c1d` para variações negativas.
Logo: espiral concêntrica representando o modelo da teia.

Documentação completa em `docs/sistema-visual.md`.

## Licença

- **Código**: MIT
- **Conteúdo editorial**: CC BY-SA 4.0
