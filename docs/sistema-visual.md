# Sistema visual — cobweb

Referência completa para manter consistência ao adicionar páginas e componentes.

## 1. Princípios

1. **Sóbrio, não chamativo**. A estética serve à leitura analítica. Nada que pareça agtech genérica.
2. **O dado é a manchete**. Tipografia editorial em volta do gráfico, nunca o oposto.
3. **Densidade com respiro**. Muito conteúdo, mas com espaço entre blocos.
4. **Sentence case sempre**. Caixa baixa em logos. Caixa-alta só em eyebrows e siglas (CEASA-SE, PROHORT).

## 2. Cores

### Marca

| Token              | Light       | Dark        | Uso                              |
|--------------------|-------------|-------------|----------------------------------|
| `--color-brand`    | `#1d9e75`   | `#5dcaa5`   | Linha principal, links de CTA    |
| `--color-negative` | `#993c1d`   | `#d85a30`   | Variação negativa, alertas       |
| `--color-positive` | `#1d9e75`   | `#5dcaa5`   | Variação positiva                |
| `--color-neutral`  | `#888780`   | `#888780`   | Séries comparativas, estável     |

### Texto

| Token                         | Light     | Dark      |
|-------------------------------|-----------|-----------|
| `--color-text`                | `#1a1a1a` | `#f0eee5` |
| `--color-text-secondary`      | `#5f5e5a` | `#b4b2a9` |
| `--color-text-tertiary`       | `#888780` | `#888780` |

### Superfícies

| Token              | Light     | Dark      |
|--------------------|-----------|-----------|
| `--color-bg`       | `#ffffff` | `#14140f` |
| `--color-bg-soft`  | `#f7f6f1` | `#1c1c17` |
| `--color-bg-card`  | `#ffffff` | `#1c1c17` |

Bordas em `rgba(26, 26, 26, 0.12)` no light, `rgba(240, 238, 229, 0.12)` no dark.

## 3. Tipografia

### Famílias

- **Serif**: Source Serif 4, fallback Georgia. Para títulos, manchetes, valores numéricos grandes em destaque.
- **Sans**: Inter, fallback system. Para corpo de texto, navegação, rótulos.
- **Mono**: JetBrains Mono. Para códigos, valores em tabelas técnicas.

### Hierarquia

| Classe        | Tamanho | Família | Peso | Uso                                    |
|---------------|---------|---------|------|----------------------------------------|
| `.eyebrow`    | 11px    | Sans    | 400  | Subseção em caixa-alta acima de título |
| `.headline`   | 36px    | Serif   | 500  | Manchete principal da página           |
| `.deck`       | 17px    | Sans    | 400  | Lide subordinado à manchete            |
| `.section-title` | 24px | Serif   | 500  | Títulos de seção interna               |
| corpo (`p`)   | 16px    | Sans    | 400  | Texto narrativo                        |

Mobile (≤640px): manchete cai para 28px, deck para 16px, section-title para 20px.

### Regras

- **Pesos**: apenas 400 e 500. Nunca 600 ou 700 (visual fica pesado).
- **Sentence case** em tudo. Inclusive em rótulos de gráfico.
- **Caixa baixa** no logo e em rótulos curtos (`/produtos`, `tomate`, `cebola`).
- **Caixa-alta** só em eyebrows e siglas oficiais (CEASA-SE, PROHORT, IPCA).
- **Sem itálico decorativo**. Itálico só para citação de obra ou termo técnico não-traduzido.

## 4. Espaçamento

- Vertical entre seções: 28–40px
- Vertical entre parágrafos: 16px
- Padding interno de cards: 16–22px
- Gap entre cards em grid: 8–12px

## 5. Componentes

### Card de índice (CEASA)

Card com borda 1px, fundo branco, padding 18px. Contém nome, sigla da CEASA, valor numérico em 28px serifado, variação percentual com cor semântica, e linha de base em 11px terciário.

### Card de subíndice (categoria)

Card com fundo `--color-bg-soft`, sem borda, padding 14×16px. Visualmente mais leve que o card de índice, comunicando hierarquia.

### Item de produto

Linha em grid 2×N com borda inferior. Conta com nome em caixa baixa, variação percentual à direita, valor numérico e preço anterior em texto secundário. Hover em `--color-bg-soft`.

### Meta strip

Linha horizontal com data, fonte e link de metodologia. Bordas top/bottom finas.

### Method note

Bloco final de cada página com `--color-bg-soft`, padding 20×22px, radius 12px. Contém eyebrow + parágrafo descritivo da metodologia.

## 6. Logo

Espiral concêntrica em quatro camadas convergindo para um ponto. Representa o modelo de cobweb estável — oscilação amortecida convergindo para o equilíbrio.

- Tamanho mínimo: 16px (favicon)
- Tamanho-padrão: 32px (header)
- Cor: `currentColor` — herda do contexto
- Versão monogramática (futuro): apenas o "c" minúsculo serifado

Em contextos editoriais sobre crise, a logo pode receber variação **divergente** (cobweb instável) onde a espiral se afasta do centro. Variante para uso pontual em panoramas de alta volatilidade.

## 7. Gráficos

- Linha principal sempre na cor de marca (Aracaju)
- Linhas comparativas sempre em `--color-neutral` cinza
- Diferenciação por padrão de tracejado: contínua / dashed / dotted
- Sem cores múltiplas saturadas. Hierarquia por traço, não por arco-íris
- Eixo Y sempre rotulado com unidade (R$ 4,80, índice 100)
- Tooltip escuro em fundo claro, claro em fundo escuro
- Padding nas extremidades para não cortar pontos extremos
- Sem `pointRadius` por padrão. `pointHoverRadius: 4` em hover

## 8. Acessibilidade

- Contraste AA mínimo em qualquer tema
- Todo gráfico tem `role="img"` e `aria-label` descritivo
- Texto de fallback dentro do `<canvas>` para leitores de tela
- Foco visível em todos os links e botões
- `prefers-reduced-motion` respeitado em qualquer animação
- Navegação por teclado inteiramente funcional

## 9. O que não fazer

- Sem gradientes
- Sem sombras pesadas (apenas focus rings funcionais)
- Sem cantos arredondados em bordas de um lado só
- Sem caixa-alta como ornamento
- Sem mid-sentence bolding
- Sem emojis na interface
- Sem mais de duas tipografias
- Sem ícones decorativos sem `aria-hidden`
