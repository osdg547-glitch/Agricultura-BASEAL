# Séries de preço de Aracaju — 2026

Documenta `dados/series-precos-se-2026.json`, o arquivo que a página `/produtos/`
lê. É o conjunto de referência do portal para preço interno em Sergipe: 54
produtos, três canais de coleta, tudo vindo dos boletins da EMDAGRO/ASPLAN.

| canal | produtos | coletas | janela |
| --- | --- | --- | --- |
| Atacado CEASA-SE | 54 | 48 | 06/01/2026 a 21/07/2026 |
| Varejo Mercado Central | 11 | 23 | 05/01/2026 a 30/03/2026 |
| Varejo Augusto Franco | 11 | 23 | 07/01/2026 a 27/03/2026 |

As janelas são diferentes porque a transcrição é assim, não porque a fonte pare:
o atacado foi transcrito até julho, o varejo só até março, e os onze produtos de
varejo são os que a consolidação do primeiro trimestre trouxe. Nada no material
que temos diz que a EMDAGRO publique varejo só para esses onze — descobrir isso
depende de olhar os boletins de varejo de abril em diante, que ainda não foram
transcritos. O portal não estende, não interpola e não estima nada para
emparelhar os três canais: cada um carrega a própria lista de datas, e o gráfico
da página desenha a união delas.

## Origem

Fonte primária: EMDAGRO / ASPLAN, boletins de preços médios praticados em
Aracaju, publicados em PDF duas a três vezes por semana.

O atacado vem de `dados/fontes/precos-atacado-ceasa-se-consolidado-v3.xlsx`,
guardado no repositório para que qualquer leitura do JSON possa ser conferida
contra a transcrição e, por ela, contra o boletim original. O campo
`meta.canais.atacado_ceasa.boletins` liga cada data ao arquivo de boletim de
onde ela saiu. A janela de janeiro a março vem de uma consolidação anterior,
validada célula a célula; as 26 datas de abril a julho foram extraídas de 10
boletins.

O varejo vem de `dados/precos-emdagro-q1-2026.json`, a transcrição do primeiro
trimestre nos dois pontos de varejo do mesmo boletim. Esse arquivo continua
servindo o mural da capa e a grade dos panoramas, que seguem no trimestre.

## Como regenerar

```bash
pip install openpyxl
python3 scripts/importar-series-precos.py
```

O script transpõe a planilha, converte para R$/kg, junta o varejo e carrega a
procedência de cada data. Não corrige, não interpola e não estima preço nenhum:
o que ele não encontra na fonte, não escreve. Quando chegar um boletim novo, ele
entra primeiro na planilha e só depois no JSON, pelo script.

`openpyxl` é dependência do script de importação, não do site. A página consome
apenas o JSON gerado.

## Estrutura do JSON

```
meta
  fonte, serie, janela, geracao, unidade_padrao, n_produtos
  unidades                            regra de conversão, em texto
  canais{canal}
    label, label_curto, descricao, frequencia, janela
    n_datas, datas[]                  índice temporal daquele canal
    nota
    feriados_sem_coleta[]             só no atacado: datas anunciadas sem preço
    lacunas[]                         só no atacado: trechos sem boletim
    datas_realinhadas[]               só no atacado: ver "Erro de junho"
    boletins{}                        só no atacado: arquivo de origem → datas
  arquivos_de_origem{}
produtos{slug}
  label, grupo                        "vegetal" ou "animal"
  {canal}                             presente só onde há coleta
    unidade_origem, tipo_unidade      "peso" ou "unidade"
    fator_conversao_kg, itens_por_unidade
    precos_unidade_origem[]           preço como o boletim publica
    precos_rs_kg[]                    preço convertido, ou null se não converte
    medias_mensais_*{}                média por mês das coletas daquele mês
    estatisticas_*{}                  n, mínimo, máximo, média, CV, nº de mudanças
```

Cada array de preço tem o mesmo comprimento da lista de datas do seu canal. Não
há buraco: toda data publicada tem preço em todos os produtos daquele canal.

Os slugs seguem o nome do produto sem acento (`limao_taiti`, `mamao_hawai`), e
os onze que já circulavam no portal não mudam: o mural da capa e a grade dos
panoramas continuam achando o produto pelo mesmo identificador, e o endereço
`/produtos/?p=tomate` sobrevive a qualquer reimportação.

## Unidades

O boletim cota por embalagem. A conversão para R$/kg divide pelo peso nominal
declarado na própria unidade — caixa de 25 kg, saco de 60 kg, arroba de 15 kg.

Doze produtos são cotados por contagem e ficam **sem** conversão, com
`precos_rs_kg: null`: abacaxi, alface lisa, banana prata, cebolinha, coco seco,
coco verde, coentro, couve, laranja pera e milho verde, todos por cento; ovo
branco e ovo vermelho, por caixa de 30 dúzias. Converter exigiria um peso médio
por peça que a EMDAGRO não publica, e estimá-lo seria inventar número. A página
detecta esse caso sozinha: mantém o eixo na unidade do boletim e diz isso na nota
metodológica.

## Erro de publicação em junho

Os boletins de 11/16/18 e de 23/25/30 de junho saíram com o bloco de produtos de
origem vegetal reordenado por grupo sem que as colunas numéricas acompanhassem:
cada linha impressa exibia o preço de outro produto. Melancia a R$ 80,00/kg,
feijão carioquinha a R$ 1,50 o saco de 60 kg e alface a R$ 2,50 o cento são os
sintomas visíveis. O bloco de origem animal não foi afetado.

A planilha realinhou os valores para a ordem padrão dos demais boletins e testou
o resultado na única data coberta pelos dois boletins de junho — 11/06, que
também aparece no boletim íntegro de 2/9/11. Antes do realinhamento, 12 dos 54
produtos coincidiam; depois, 54 de 54.

O JSON publica os valores realinhados e marca as seis datas em
`meta.canais.atacado_ceasa.datas_realinhadas`. A nota metodológica de `/produtos/`
declara o ajuste, como deve: o realinhamento é inferência verificada, não
confirmação da fonte. A transcrição literal do que a EMDAGRO publicou está
preservada na aba "Junho como publicado" da planilha. A confirmação definitiva
depende do arquivo original da EMDAGRO ou de consulta à ASPLAN.

## Limitações

- **Preços travados.** Vários produtos passam meses sem variação nenhuma — alho a
  R$ 20,00/kg nas 48 coletas, por exemplo. É inércia de coleta e arredondamento
  da ASPLAN, não estabilidade de mercado. A página avisa disso na descrição.
- **Não é série diária.** São 2 a 3 dias úteis por semana, com feriados fora
  (02/04, 21/04, 04/06) e sem boletim publicado entre 16/04 e 05/05. Média mensal
  aqui é média das coletas do mês, não média de dias.
- **Erro não detectado não é erro ausente.** A conferência foi interna à fonte. O
  que captura erro sistemático de leitura é validação cruzada contra fonte
  independente (CODERSE, PROHORT/CONAB), ainda por fazer.
- **Uma praça só.** Aracaju. Não descreve o preço no interior do estado.
- **A cobertura do varejo é da transcrição, não da fonte.** Onze produtos e um
  trimestre é o que existe transcrito, e as ressalvas da página dizem isso. Se os
  boletins de varejo cobrem mais produtos ou meses, o portal ainda não sabe.
- **O Mercado Central não é varejo final.** A fonte o rotula como varejo, mas os
  preços ficam próximos ou abaixo do atacado. É canal híbrido, de atacarejo
  popular. Usá-lo como proxy de preço de supermercado subestima o varejo.

## Verificação feita na importação

Conferidos contra as fontes, produto a produto e data a data: as abas "Série
larga" e "Série longa" da planilha batem entre si nos 54 × 48 pontos; as
conversões para R$/kg batem com a unidade declarada; as estatísticas batem com a
aba "Estatísticas" da fonte; as séries de varejo reproduzem exatamente o arquivo
do primeiro trimestre; e as 22 datas de janeiro a março do atacado reproduzem
exatamente os valores que o portal já publicava. Zero divergências.
