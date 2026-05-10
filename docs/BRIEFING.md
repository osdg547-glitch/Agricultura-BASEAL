# Briefing — projeto cobweb

Documento de contexto para qualquer pessoa (ou IA) que vá dar continuidade ao desenvolvimento. Lido isto antes de tocar no código, você economiza meio dia.

---

## 1. O que é o projeto

**cobweb** é um portal editorial de preços do hortifrúti em Sergipe. A entrega de cada mês é um índice de preços por CEASA, comentário de conjuntura, e fichas de produto navegáveis. Não é um aplicativo, não é um marketplace — é um veículo editorial estilo Nexo / Pulitzer Center / CEPEA, com identidade visual sóbria e dados públicos bem organizados.

O nome vem do **modelo da teia** (cobweb model), referência clássica da economia agrícola para descrever a oscilação cíclica de preços em culturas com defasagem entre decisão de plantio e colheita. A logo é a representação geométrica desse modelo: espiral concêntrica convergindo para um ponto.

## 2. Tese editorial — não esqueça disto ao codar

O portal existe porque há uma assimetria de informação real na cadeia do hortifrúti que prejudica o produtor familiar. A informação de preço do PROHORT/CONAB *existe*, mas é desorganizada, sem narrativa, sem comparação interestadual sistemática. Resolver essa parte específica (a parte informacional) não exige plataforma com matching, crédito ou logística — exige dados públicos bem organizados e narrativa local.

Isso tem três implicações para o design:

1. **O índice é a manchete, não o preço de um produto.** A home abre com o índice das três CEASAs. Detalhe por produto é nível 2.
2. **Comparação interestadual é constitutiva.** Aracaju nunca aparece sozinho. Sempre ao lado de Recife (maior do Nordeste) e São Paulo (âncora nacional).
3. **O texto editorial importa.** Cada mês tem um "panorama" — texto de 2 a 4 parágrafos explicando o que aconteceu. O gráfico não fala sozinho.

## 3. Público

Pirâmide invertida:

- **Topo** (poucos, alto valor): pesquisadores UFS/Embrapa/BNB, técnicos da EMDAGRO, jornalistas de economia, consultores agrícolas. Geram autoridade e citação.
- **Meio** (transacional): técnicos de cooperativa, gerentes de varejo regional, sobrinho-do-produtor.
- **Base** (escala futura): produtor familiar diretamente. Cresce ao longo dos anos com versão mobile e distribuição via WhatsApp.

A estratégia de aquisição vai de cima para baixo. Tentar começar pela base é o erro clássico que mata projetos de tecnologia rural no Nordeste.

## 4. Arquitetura do site

Estrutura de URLs:

```
/                          → home com índice geral + comentário + produtos em destaque
/produtos/                 → lista completa das 15 culturas
/produtos/tomate/          → ficha individual: série temporal, ciclo cobweb, comentário
/produtos/cebola/          → idem
/panoramas/                → arquivo dos comentários mensais
/panoramas/2026-05/        → panorama específico
/dados/                    → downloads em CSV e API/JSON
/sobre/                    → quem é o portal
/sobre/metodologia/        → como o índice é calculado
```

## 5. Stack e dependências

**Decisão fundamental que ainda está em aberto**: site estático (Hugo, Astro, Eleventy) versus framework dinâmico. Recomendação: **estático**. Razões:

- Conteúdo muda mensalmente, não em tempo real
- Hospedagem grátis no GitHub Pages, Cloudflare Pages, Netlify
- Performance e SEO superiores
- Manutenção mínima
- Fácil de versionar e revisar conteúdo via PR

**Eleventy** (11ty) é provavelmente a melhor escolha: simples, em JavaScript, suporta Markdown para os panoramas e dados em JSON/YAML para os produtos. **Astro** vale considerar se você quer ilhas interativas mais sofisticadas. **Hugo** é mais rápido mas menos flexível.

Os arquivos atuais são HTML/CSS/JS puros — uma versão de referência. O Claude Code deve **migrar para 11ty (ou Astro)** assim que confirmada a decisão, transformando os componentes repetitivos (cabeçalho, footer, cards) em layouts e parciais.

**Bibliotecas externas**:
- Chart.js 4.x para gráficos (CDN, sem build)
- Source Serif 4 + Inter via Google Fonts
- Nenhum framework CSS — Tailwind etc. são proibidos. Não combina com a identidade editorial.

## 6. Sistema visual

Documentado em `/docs/sistema-visual.md`. Resumo:

- **Cores**: verde profundo (#1d9e75) como marca, vermelho-terra (#993c1d) para variações negativas, cinzas neutros para séries comparativas
- **Tipografia**: Source Serif 4 para títulos e dados, Inter para corpo
- **Bordas**: 1px sólida em rgba(0,0,0,0.12). Cards arredondados em 12px
- **Hierarquia editorial**: eyebrow (11px caixa-alta) → headline serifada (36px) → deck (17px secundária) → corpo (16px)
- **Sentence case sempre**. Caixa baixa em logos e rótulos curtos. Nunca caixa-alta como ornamento (exceto eyebrows e siglas de CEASAs)

Dark mode é obrigatório e funciona via `@media (prefers-color-scheme: dark)`.

## 7. Dados — onde estão e onde virão

**Hoje**: dados ilustrativos hardcoded no HTML e gerados aleatoriamente em `assets/js/indice-geral.js`. Tudo placeholder.

**Próximo passo**: estabelecer pipeline de dados.

- Fonte primária: **PROHORT/CONAB** (`https://dw.prohort.conab.gov.br`) — dados de CEASAs do Brasil, atualização diária ou semanal
- Fonte secundária: **boletins do CEASA-SE** quando disponíveis (não está claro se há feed público estruturado)
- Fonte de produção: **IBGE/PAM** para área plantada e rendimento por município
- Fonte de consumo: **POF/IBGE** para pesos da cesta de consumo aracajuano (caso decida-se pelo índice cesta-fixa)

Estrutura sugerida para `/dados/`:

```
/dados/indice-geral.json          → série mensal das três CEASAs
/dados/produtos/tomate.json       → série mensal por produto
/dados/produtos/cebola.json
...
/dados/csv/indice-geral.csv       → versão CSV para download
```

Pipeline ideal: script Python rodando em GitHub Actions que (i) busca dados do PROHORT, (ii) calcula o índice, (iii) atualiza os JSON, (iv) abre PR. Frequência: semanal.

## 8. Identidade visual no GitHub

- Logo principal: `/assets/img/logo.svg`
- Favicon: `/assets/img/favicon.svg`

Logo usa `currentColor` — herda a cor do contexto. Funciona em qualquer cor de fundo.

## 9. Acessibilidade — não negociável

- Contraste AA mínimo (testar em dark mode também)
- Todo gráfico tem `role="img"` e `aria-label` descritivo
- Todo gráfico tem fallback textual entre as tags do `<canvas>`
- Navegação por teclado funcional
- Sentence case ajuda leitores de tela
- `prefers-reduced-motion` deve ser respeitado nas animações

## 10. SEO

- Manchetes editoriais reais, não chamativas
- `<meta description>` única por página, baseada no deck
- Open Graph com imagem do gráfico do mês (gerar via script ou manualmente)
- Sitemap.xml + robots.txt
- URLs limpas com hífens, não underlines

## 11. Decisões abertas para o operador

Questões que o Claude Code não deve decidir sozinho:

- **Estrutura jurídica do projeto**: MEI, ME, ou pessoa física?
- **Hospedagem**: GitHub Pages versus Cloudflare Pages versus Netlify?
- **Domínio**: cobweb.com.br? cobweb-se.org? algo derivado?
- **Licença de conteúdo**: CC BY-SA 4.0 (atual) versus CC BY 4.0 versus CC0?
- **Cesta do índice**: ponderado por volume (atual) versus cesta fixa (POF)?
- **Adicionar Salvador (CEASA-BA)** como quarta CEASA de comparação?

Quando o Claude Code esbarrar em uma dessas, **pergunte ao operador antes de agir**.

## 12. Critério de qualidade

Antes de fazer commit / merge:

1. A página renderiza igual em Chrome, Firefox, Safari?
2. Funciona em mobile (≤640px) sem quebrar layout?
3. Funciona em dark mode?
4. Lighthouse: performance ≥95, acessibilidade ≥95, SEO ≥95?
5. O texto está em sentence case e o conteúdo técnico foi revisado?
6. Os números fazem sentido — não tem `0.30000000000000004` aparecendo?

## 13. O que não fazer

- Não adicionar Tailwind, Bootstrap ou qualquer framework CSS
- Não usar emojis na interface
- Não usar caixa-alta como decoração
- Não criar gradientes, sombras pesadas ou efeitos neon
- Não inventar dados — sempre marcar como placeholder
- Não escrever copy genérica de agtech ("revolucionando a agricultura...") — o tom é editorial, sóbrio, factual
- Não adicionar tracking de terceiros sem aprovação explícita do operador
- Não tentar fazer PWA, app, ou complicação prematura. Página estática rápida é o produto

---

Quando em dúvida, releia a seção 2 (tese editorial). Tudo decorre dela.
