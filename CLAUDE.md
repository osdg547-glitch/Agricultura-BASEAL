# Instruções para Claude Code

Este arquivo orienta agentes de IA (especialmente Claude Code) que vão dar continuidade ao desenvolvimento do projeto cobweb.

## Antes de qualquer coisa

**Leia, em ordem:**

1. `docs/BRIEFING.md` — contexto editorial e tese do projeto
2. `docs/sistema-visual.md` — tokens e regras de design
3. `README.md` — instruções operacionais

Sem esses três documentos lidos, qualquer mudança terá alta chance de quebrar a coerência do projeto.

## O que este projeto é (e o que não é)

É um portal editorial de preços do hortifrúti em Sergipe, com identidade visual sóbria e pública-alvo composta primariamente por pesquisadores, jornalistas e gestores. Não é um aplicativo de consumidor, não é um marketplace, não é uma plataforma de matching. A simplicidade é constitutiva.

## Como abordar uma tarefa

1. **Verifique se a tarefa preserva a tese editorial.** Se a mudança proposta sugere "vamos adicionar gamificação para engajar o produtor", pare e questione. A tese do portal é informacional e editorial, não transacional.

2. **Mantenha sentence case e hierarquia visual.** Toda página segue o padrão eyebrow → headline → deck → meta strip → conteúdo → method note → footer.

3. **Não introduza dependências sem justificativa explícita.** Tailwind, Bootstrap, jQuery, frameworks CSS estão proibidos. Chart.js e Google Fonts são as únicas dependências externas atuais.

4. **Use os tokens CSS já definidos em `cobweb.css`.** Não hardcode cores, tipografia ou espaçamento. Se um valor faltar, adicione como variável.

5. **Dark mode é obrigatório.** Toda mudança visual precisa ser testada em ambos os temas.

## Stack atual (provisória)

HTML/CSS/JS puros, sem build. É a versão de referência que prova a identidade visual. A primeira tarefa séria provavelmente é migrar para um gerador estático.

**Recomendação para migração**: Eleventy (11ty). Razões:
- Simples, JavaScript-based
- Suporta Markdown (panoramas mensais ficam em arquivos .md)
- Suporta JSON/YAML como fonte de dados (produtos)
- Layouts e parciais cobrem cabeçalho, footer, cards repetidos
- Build rápido, deploy estático em qualquer lugar

**Alternativa**: Astro, se a quantidade de interatividade aumentar.

Pergunte ao operador antes de migrar, mas pode propor a migração.

## Padrões de código

- Indentação: 2 espaços
- Aspas duplas em HTML, simples em JS
- Português nos comentários, nomes de classes e atributos públicos
- Inglês apenas em propriedades CSS e nomes de funções JS
- Sempre incluir `lang="pt-BR"` no `<html>`
- Sempre incluir `<meta charset="UTF-8">` e `<meta name="viewport">`
- Sempre incluir `<title>`, `<meta description>` e Open Graph
- Sempre usar URLs absolutas (`/assets/...`) — facilita deploy em subpaths

## Acessibilidade — não negociável

Antes de qualquer commit:

- Contraste AA mínimo em ambos os temas
- Todo `<canvas>` tem `role="img"` + `aria-label` + fallback de texto
- Todo ícone decorativo tem `aria-hidden="true"`
- Todo link e botão tem foco visível
- Estrutura de heading hierárquica (h1 → h2 → h3, sem pular)

## Dados

Hoje os dados são placeholders. A primeira tarefa relacionada a dados é estabelecer o pipeline com PROHORT/CONAB. Antes de implementar:

1. **Pergunte ao operador** se ele já tem credenciais ou contato no CONAB
2. **Pergunte ao operador** sobre a metodologia exata do índice (ponderação por volume? cesta fixa? base 100 quando?)
3. **Não invente números**. Se precisar de placeholder, marque claramente como placeholder no comentário e no UI quando possível

## Commits e PRs

- Mensagens em português
- Estrutura: `tipo: descrição curta` (ex: `feat: adiciona página de produto`, `fix: corrige contraste em dark mode`)
- PRs descrevem **o que mudou** e **por que** — não apenas a lista de arquivos
- Para mudanças de design, anexar screenshot light + dark

## Quando perguntar antes de agir

- Mudanças na arquitetura de URLs
- Mudanças no sistema visual (cores, tipografia, espaçamento)
- Adição de bibliotecas externas
- Decisões editoriais (que produtos cobrir, qual período da série)
- Decisões metodológicas (como calcular o índice)
- Decisões legais (licença, termos de uso, política de dados)

## Quando agir sem perguntar

- Correção de bugs evidentes
- Refatoração que não muda comportamento
- Melhoria de acessibilidade
- Otimização de performance
- Correção de tipografia, gramática, ortografia
- Reorganização interna de arquivos sem mudar URLs públicas
