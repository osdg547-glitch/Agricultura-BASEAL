# Série de atacado do CEASA-SE — jan a jul de 2026

Documenta `dados/precos-atacado-ceasa-se-2026.json`, a série consolidada de preços
de atacado do CEASA Aracaju. É o conjunto de referência do portal para atacado em
Sergipe: 54 produtos e 48 datas de coleta entre 06/01/2026 e 21/07/2026.

## Origem

Fonte primária: EMDAGRO / ASPLAN, boletins "Preços médios de atacado — CEASA",
publicados em PDF. A transcrição vive em
`dados/fontes/precos-atacado-ceasa-se-consolidado-v3.xlsx`, guardada no repositório
para que qualquer leitura do JSON possa ser conferida contra a planilha e, por ela,
contra o boletim original. O campo `meta.boletins` do JSON liga cada data ao arquivo
de boletim de onde ela saiu.

A janela de janeiro a março vem da consolidação anterior, validada célula a célula, e
é a mesma que já alimenta `dados/precos-emdagro-q1-2026.json`. As 26 datas de abril a
julho foram extraídas de 10 boletins.

## Como regenerar

```bash
pip install openpyxl
python3 scripts/importar-atacado-ceasa.py
```

O script transpõe a planilha, converte para R$/kg e carrega a procedência de cada
data. Não corrige, não interpola e não estima preço nenhum: o que ele não encontra
na fonte, não escreve. Quando chegar um boletim novo, ele entra primeiro na planilha
e só depois no JSON, pelo script.

`openpyxl` é dependência do script de importação, não do site. As páginas consomem
apenas o JSON.

## Estrutura do JSON

```
meta
  fonte, serie, janela, geracao, frequencia
  n_produtos, n_datas, datas[]        índice temporal comum a todos os produtos
  feriados_sem_coleta[]               datas anunciadas no boletim, sem preço publicado
  lacunas[]                           trechos sem boletim
  datas_realinhadas[]                 ver "Erro de publicação em junho"
  boletins{}                          arquivo de origem → datas que ele cobre
produtos{slug}
  label, grupo                        "vegetal" ou "animal"
  unidade_origem, tipo_unidade        "peso" ou "unidade"
  fator_conversao_kg, itens_por_unidade
  precos_unidade_origem[]             preço como o boletim publica, 48 posições
  precos_rs_kg[]                      preço convertido, ou null se não converte
  medias_mensais_*{}                  média por mês das coletas daquele mês
  estatisticas_*{}                    n, mínimo, máximo, média, CV, nº de mudanças
```

Os arrays de preço têm sempre 48 posições, na ordem de `meta.datas`. Não há buraco:
toda data publicada tem preço em todos os 54 produtos.

Os slugs das onze fichas já publicadas (`tomate`, `cebola_roxa`, `batata_lisa`,
`manga_tommy`, `inhame_da_costa`, `cenoura`, `limao_taiti`, `mamao_hawai`,
`repolho_verde`, `macaxeira`, `acerola`) são os mesmos do arquivo Q1, de propósito:
qualquer página pode trocar de fonte sem trocar de identificador.

## Unidades

O boletim cota por embalagem. A conversão para R$/kg divide pelo peso nominal
declarado na própria unidade — caixa de 25 kg, saco de 60 kg, arroba de 15 kg.

Doze produtos são cotados por contagem e ficam **sem** conversão, com
`precos_rs_kg: null`: abacaxi, alface lisa, banana prata, cebolinha, coco seco, coco
verde, coentro, couve, laranja pera e milho verde, todos por cento; ovo branco e ovo
vermelho, por caixa de 30 dúzias. Converter exigiria um peso médio por peça que a
EMDAGRO não publica, e estimá-lo seria inventar número. Quem exibir esses produtos
precisa exibir a unidade de origem junto do preço.

## Erro de publicação em junho

Os boletins de 11/16/18 e de 23/25/30 de junho saíram com o bloco de produtos de
origem vegetal reordenado por grupo sem que as colunas numéricas acompanhassem: cada
linha impressa exibia o preço de outro produto. Melancia a R$ 80,00/kg, feijão
carioquinha a R$ 1,50 o saco de 60 kg e alface a R$ 2,50 o cento são os sintomas
visíveis. O bloco de origem animal não foi afetado.

A planilha realinhou os valores para a ordem padrão dos demais boletins e testou o
resultado na única data coberta pelos dois boletins de junho — 11/06, que também
aparece no boletim íntegro de 2/9/11. Antes do realinhamento, 12 dos 54 produtos
coincidiam; depois, 54 de 54.

O JSON publica os valores realinhados e marca as seis datas em
`meta.datas_realinhadas`. **Qualquer página que exiba junho de 2026 precisa declarar
o ajuste na nota metodológica**: o realinhamento é inferência verificada, não
confirmação da fonte. A transcrição literal do que a EMDAGRO publicou está preservada
na aba "Junho como publicado" da planilha. A confirmação definitiva depende do arquivo
original da EMDAGRO ou de consulta à ASPLAN.

## Limitações

- **Preços travados.** Vários produtos passam meses sem variação nenhuma — alho a
  R$ 20,00/kg nas 48 coletas, por exemplo. É inércia de coleta e arredondamento da
  ASPLAN, não estabilidade de mercado. As fichas de produto já tratam isso como
  achado editorial, e não como dado limpo.
- **Não é série diária.** São 2 a 3 dias úteis por semana, com feriados fora e sem
  boletim publicado entre 16/04 e 05/05. Média mensal aqui é média das coletas do mês,
  não média de dias.
- **Erro não detectado não é erro ausente.** A conferência foi interna à fonte. O que
  captura erro sistemático de leitura é validação cruzada contra fonte independente
  (CODERSE, PROHORT/CONAB), ainda por fazer.
- **Uma praça só.** CEASA Aracaju. Não descreve o preço de atacado no interior do
  estado.

## Verificação feita na importação

Conferidos contra a planilha, produto a produto e data a data: as abas "Série larga" e
"Série longa" batem entre si nos 54 × 48 pontos; as conversões para R$/kg batem com a
unidade declarada; as estatísticas batem com a aba "Estatísticas" da fonte; e as 22
datas de janeiro a março reproduzem exatamente os valores já publicados em
`dados/precos-emdagro-q1-2026.json` para os onze produtos com ficha. Zero divergências.

## O que ainda não usa esta série

O site continua lendo `dados/precos-emdagro-q1-2026.json` no mural da capa, na página
de panoramas e nas onze fichas de produto. Aquele arquivo tem os três canais (atacado,
Mercado Central, Augusto Franco) e cobre só o primeiro trimestre; o texto editorial das
fichas analisa esse trimestre, com números escritos à mão no HTML. Estender os gráficos
até julho é decisão editorial: pede reescrita das leituras de série, das estatísticas
de cada ficha e da chamada "o trimestre em onze séries" na capa. A série está pronta
para quando essa decisão for tomada.
