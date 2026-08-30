# Séries de preço de Aracaju — 2026

Documenta `dados/series-precos-se-2026.json`, o arquivo que a página `/produtos/`
lê. É o conjunto de referência do portal para preço interno em Sergipe: 71
produtos em três canais de coleta, tudo vindo dos boletins da EMDAGRO/ASPLAN.

| canal | produtos | coletas | janela |
| --- | --- | --- | --- |
| Atacado CEASA-SE | 54 | 48 | 06/01/2026 a 21/07/2026 |
| Varejo Mercado Central | 65 | 58 | 05/01/2026 a 29/07/2026 |
| Varejo Augusto Franco | 11 | 23 | 07/01/2026 a 27/03/2026 |

São 71 produtos no total: 48 aparecem no atacado e no Mercado Central, 6 só no
atacado e 17 só no varejo — treze deles cortes de carne, que o boletim de atacado
não cota.

O Augusto Franco é o único canal ainda sem reconsolidação. Sua cobertura curta
— onze produtos, primeiro trimestre — é da transcrição, não da fonte: foi o que
a consolidação antiga trouxe. O caso do Mercado Central mostra o tamanho do
efeito: enquanto o portal publicava onze produtos até março, o boletim daquele
mesmo mercado cotava 65 desde janeiro.

O portal não estende, não interpola e não estima nada para emparelhar os três
canais: cada um carrega a própria lista de datas, e o gráfico da página desenha
a união delas.

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

O Mercado Central vem de
`dados/fontes/emdagro-mercado-central-precos-diarios-2026.csv`, formato longo,
uma linha por produto e dia, com o PDF de origem em cada linha. São 23 boletins,
3.900 observações, nenhum preço faltando, 65 produtos em todas as 58 datas. Duas
datas (20/05 e 10/06) aparecem em dois boletins cada, porque as janelas
publicadas se sobrepõem; os valores coincidem em 100% dos produtos, e a leitura
repetida é descartada em vez de virar coleta a mais.

O Augusto Franco vem de `dados/precos-emdagro-q1-2026.json`, a consolidação
antiga do primeiro trimestre. Esse arquivo continua servindo também o mural da
capa e a grade dos panoramas, que seguem no trimestre.

**Uma divergência entre transcrições.** A reconsolidação do Mercado Central
reproduz exatamente a série que o portal publicava em 251 das 253 células do
primeiro trimestre. As duas exceções são o inhame da costa em 02/03 e 04/03: a
transcrição antiga registrava R$ 12,00 e a nova registra R$ 15,00. O portal passa
a publicar a nova, por ser a reconsolidação feita a partir dos PDFs, mas qual
delas está certa só o boletim original responde.

## Como regenerar

```bash
pip install openpyxl
python3 scripts/importar-series-precos.py
```

O script transpõe a planilha do atacado, lê o CSV do varejo, converte para R$/kg
onde a unidade tem peso, junta os canais e carrega a procedência de cada data. Não corrige, não interpola e não estima preço nenhum:
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
  unidade_referencia                a unidade do produto: tipo, peça, sufixo, legenda
  {canal}                             presente só onde há coleta
    unidade_origem, tipo_unidade      "peso", "unidade", "opaca" ou "mista"
    peca_contada                      unidade, molho, pé, cabeça — quando é contagem
    fator_conversao_kg, itens_por_unidade
    unidade_variou                    true onde a unidade muda no meio da série
    unidades_por_data[]               só quando variou
    precos_unidade_origem[]           preço como o boletim publica
    precos_referencia[]               o mesmo preço na unidade do produto, com
                                      null onde a conversão não existe
    conversoes[]                      as divisões aplicadas, em texto
    convertivel, n_convertidas        se entra no gráfico, e com quantas coletas
    trechos[]                         faixas contínuas de valor convertido
    medias_mensais{}, estatisticas{}  na unidade de referência, sobre o que converteu
```

Cada array de preço tem o mesmo comprimento da lista de datas do seu canal. Não
há buraco: toda data publicada tem preço em todos os produtos daquele canal.

Os slugs seguem o nome do produto sem acento (`limao_taiti`, `mamao_hawai`), e
os onze que já circulavam no portal não mudam: o mural da capa e a grade dos
panoramas continuam achando o produto pelo mesmo identificador, e o endereço
`/produtos/?p=tomate` sobrevive a qualquer reimportação.

## Unidades

**Cada produto tem uma unidade só, a mesma em todos os canais**, declarada em
`unidade_referencia`. A regra é:

- Algum canal cota por peso → a unidade é o **quilo**. O preço da embalagem é
  dividido pelo peso nominal que ela nomeia: caixa de 25 kg, saco de 60 kg,
  arroba de 15 kg.
- Nenhum canal cota por peso → a unidade é a **peça**. A embalagem de contagem é
  dividida pelo número de peças que ela nomeia: o cento por cem, a caixa de
  trinta dúzias por trezentos e sessenta, a dúzia por doze. São 14 produtos, e a
  peça herda o nome mais específico entre os canais — "R$ por molho" para o
  coentro, "R$ por espiga" para o milho verde.

A divisão é aritmética da própria unidade, não estimativa. O que ela supõe é que
a embalagem do atacado conta a mesma peça que o varejo vende: que o cento de
coentro são 100 molhos, que o cento de alface são 100 pés. A nota metodológica da
página declara essa premissa.

**Onde a conversão não existe, o preço fica nulo em vez de ser suposto.** Quilo
não vira peça, nem peça vira quilo, sem um peso por peça que a EMDAGRO não
publica. Dois casos:

- **Canal inteiro fora da unidade.** O quiabo é cotado por saco de 25 kg no
  atacado e por cento no varejo: a unidade do produto é o quilo, e o varejo fica
  com `convertivel: false` — existe no arquivo, não entra no gráfico.
- **Trecho fora da unidade.** Nos sete produtos de unidade variável, só as
  coletas na unidade do produto convertem. O campo `n_convertidas` diz quantas
  são: 16 de 58 no alho, 3 de 58 no chuchu, 40 de 58 no melão.

A lata, unidade do amendoim em parte da série, não é peça nem peso: é recipiente
de conteúdo não declarado, e não converte para nada.

## Unidade que muda no meio da série

Em sete produtos do varejo — alface, alho, amendoim com casca cozido, caju,
chuchu, melão espanhol e pimentão verde — a unidade de venda alterna ao longo do
período, entre quilo e peça. O alho, por exemplo, vai de cabeça para quilo e volta
seis vezes entre janeiro e julho.

Nesses produtos só as coletas que estão na unidade do produto entram em
`precos_referencia`; as outras ficam nulas. `trechos` guarda as faixas contínuas
que sobraram, e a página desenha uma linha por faixa: a série se interrompe onde
a comparação deixaria de valer, em vez de ligar por cima do buraco. As médias e
estatísticas do canal são calculadas só sobre o que converteu, e o cartão diz
quantas coletas são de quantas.

## Saltos abruptos no varejo

A consolidação do varejo marca doze variações de 40% ou mais entre coletas
consecutivas, e sete casos em que o preço médio, o máximo e o mínimo publicados
no mesmo boletim divergem entre si. O extremo é o alho, que sai de R$ 2,00 para
R$ 25,00 o quilo na última coleta de julho. São valores publicados e transcritos
como estão; a própria fonte recomenda conferir antes de usá-los em série.

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
- **O Augusto Franco ainda é da transcrição antiga.** Onze produtos e um
  trimestre é o que existe transcrito desse canal. O Mercado Central mostrou que
  a limitação era nossa; presumir o mesmo do Augusto Franco é razoável, mas só a
  transcrição dos boletins dele confirma.
- **Os produtos não foram fundidos por semelhança de nome.** O varejo cota
  "abacaxi grande", "abóbora", "alface" e "cebola branca" onde o atacado cota
  "abacaxi", "abóbora de leite", "alface lisa" e "cebola pera". São entradas
  separadas de propósito: uni-las afirmaria uma identidade de produto que a fonte
  não declara. Só diferenças de grafia foram pareadas — "arroz agulha T 1" com
  "arroz agulha T1", "mamão haway" com "mamão hawai".
- **O Mercado Central não é varejo final.** A fonte o rotula como varejo, mas os
  preços ficam próximos ou abaixo do atacado. É canal híbrido, de atacarejo
  popular. Usá-lo como proxy de preço de supermercado subestima o varejo.

## Verificação feita na importação

Conferidos contra as fontes, produto a produto e data a data: as abas "Série
larga" e "Série longa" da planilha batem entre si nos 54 × 48 pontos; as
conversões para R$/kg batem com a unidade declarada; as estatísticas batem com a
aba "Estatísticas" da fonte; os 65 produtos do varejo reproduzem
exatamente as 58 datas do CSV de origem; e as 22 datas de janeiro a março do
atacado reproduzem exatamente os valores que o portal já publicava. A única
divergência encontrada está registrada acima: duas células do inhame da costa em
março, onde as duas transcrições do varejo discordam.
