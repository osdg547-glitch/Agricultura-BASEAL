#!/usr/bin/env python3
"""Gera dados/series-precos-se-2026.json, a série que a página /produtos/ lê.

Junta três fontes num arquivo só:

  atacado CEASA-SE
      dados/fontes/precos-atacado-ceasa-se-consolidado-v3.xlsx
      54 produtos, 48 coletas de jan a jul de 2026, transcrição dos boletins
      "Preços médios de atacado - CEASA" da EMDAGRO/ASPLAN.

  varejo Mercado Central
      dados/fontes/emdagro-mercado-central-precos-diarios-2026.csv
      65 produtos, 58 coletas de jan a jul de 2026, transcrição dos boletins
      "Preços de varejo - Mercado Central de Aracaju" (Mercado Maria Virgínia
      Leite Franco), formato longo, uma linha por produto e dia.

  varejo Augusto Franco
      dados/precos-emdagro-q1-2026.json
      11 produtos, 23 coletas de jan a mar de 2026. Único canal ainda sem
      reconsolidação: cobre só o primeiro trimestre e a cesta antiga.

Cada canal guarda a própria lista de datas, porque as coletas não coincidem e as
janelas diferem. O script não corrige, não interpola e não estima: o que não
está na fonte não é escrito.

Dependência: openpyxl (pip install openpyxl). Só é necessária para reimportar a
planilha do atacado; o site consome apenas o JSON gerado.

Uso:
    python3 scripts/importar-series-precos.py
"""

import csv
import json
import re
import unicodedata
from collections import OrderedDict
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
PLANILHA = RAIZ / "dados" / "fontes" / "precos-atacado-ceasa-se-consolidado-v3.xlsx"
MERCADO_CENTRAL = RAIZ / "dados" / "fontes" / "emdagro-mercado-central-precos-diarios-2026.csv"
AUGUSTO_FRANCO = RAIZ / "dados" / "precos-emdagro-q1-2026.json"
SAIDA = RAIZ / "dados" / "series-precos-se-2026.json"

GERACAO = "2026-08-30"

CANAL_ATACADO = "atacado_ceasa"
CANAL_MC = "varejo_mercado_central"
CANAL_AF = "varejo_augusto_franco"

# Datas que aparecem no cabeçalho dos boletins de atacado marcadas como feriado,
# sem preço publicado. Não entram na série.
FERIADOS = ["2026-04-02", "2026-04-21", "2026-06-04"]

# Os sete últimos produtos do boletim de atacado formam o bloco de origem animal.
PRODUTOS_ANIMAIS = {
    "Carne bovina dianteira",
    "Carne bovina traseira",
    "Frango de granja",
    "Manteiga",
    "Ovo branco grande",
    "Ovo vermelho grande",
    "Queijo coalho",
}

# Slugs que já circulam no portal (mural da capa, grade dos panoramas, links de
# produto) e não podem mudar, mais os casos em que a transliteração automática
# ficaria ilegível.
SLUGS_FIXOS = {
    "Macaxeira (Aipim)": "macaxeira",
    "Amendoim c/ casca cozido": "amendoim_com_casca_cozido",
}

# Rótulos já publicados no portal, mantidos para não divergir.
ROTULOS_FIXOS = {
    "Macaxeira (Aipim)": "Macaxeira (aipim)",
}

# O boletim de varejo grafa tudo em caixa alta e sem acento. Estes são os
# rótulos legíveis dos produtos que só existem no varejo — ortografia, não
# renomeação: nenhum produto é fundido com outro por aqui.
ROTULOS_VAREJO = {
    "ABACAXI GRANDE": "Abacaxi grande",
    "ABOBORA": "Abóbora",
    "ACEM C/ OSSO": "Acém com osso",
    "ACEM S/ OSSO": "Acém sem osso",
    "ALCATRA": "Alcatra",
    "ALFACE": "Alface",
    "CARNE SUINA TRASEIRA": "Carne suína traseira",
    "CEBOLA BRANCA": "Cebola branca",
    "CHA DE DENTRO (COXAO MOLE)": "Chã de dentro (coxão mole)",
    "CHA DE FORA (COXAO DURO)": "Chã de fora (coxão duro)",
    "CONTRA FILE": "Contrafilé",
    "COSTELA": "Costela",
    "FILE MIGNION": "Filé mignon",
    "MUSCULO": "Músculo",
    "PALETA C/ OSSO": "Paleta com osso",
    "PATINHO": "Patinho",
    "PEITO C/ OSSO": "Peito com osso",
}

# Pareamentos entre os dois boletins que são só diferença de grafia. Casos em
# que o varejo usa nome genérico e o atacado especifica variedade — abacaxi
# grande, abóbora, alface, cebola branca — ficam de fora de propósito: uni-los
# afirmaria uma identidade de produto que a fonte não declara.
PAREAMENTOS = {
    "ARROZ AGULHA T 1": "arroz_agulha_t1",
    "MAMAO HAWAY": "mamao_hawai",
}

ROTULOS_CANAL = {
    CANAL_ATACADO: "Atacado CEASA-SE",
    CANAL_MC: "Varejo Mercado Central",
    CANAL_AF: "Varejo Augusto Franco",
}

# Nome curto para onde a largura é apertada, como o cabeçalho dos cartões.
ROTULOS_CURTOS = {
    CANAL_ATACADO: "CEASA-SE",
    CANAL_MC: "Mercado Central",
    CANAL_AF: "Augusto Franco",
}

# Unidades de contagem: o boletim cota por peça, não por peso. Sem peso nominal
# publicado pela fonte, converter para R$/kg seria inventar número. O valor é
# (itens por unidade, nome da peça contada).
UNIDADES_CONTAGEM = {
    "cento": (100, "unidade"),
    "cx 30 dz": (360, "unidade"),
    "dz": (12, "unidade"),
    "um": (1, "unidade"),
    "uma": (1, "unidade"),
    "unidade": (1, "unidade"),
    "pe": (1, "pé"),
    "cab.": (1, "cabeça"),
    "molho": (1, "molho"),
    "espiga": (1, "espiga"),
    "lata": (1, "lata"),
}


def slug(rotulo):
    if rotulo in SLUGS_FIXOS:
        return SLUGS_FIXOS[rotulo]
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", sem_acento(rotulo).lower())).strip("_")


def sem_acento(texto):
    return unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()


def normalizar_nome(texto):
    return re.sub(r"[^a-z0-9]+", " ", sem_acento(texto).lower()).strip()


def analisar_unidade(unidade):
    """Devolve (fator_kg, itens_por_unidade, tipo, peca) para a unidade do boletim.

    fator_kg é None quando a unidade é de contagem: nesse caso o preço fica na
    unidade de origem e a página precisa dizer isso ao leitor.
    """
    chave = unidade.strip().lower()
    if chave in UNIDADES_CONTAGEM:
        itens, peca = UNIDADES_CONTAGEM[chave]
        return None, itens, "unidade", peca
    achado = re.search(r"(\d+(?:[.,]\d+)?)\s*kg", chave)
    if achado:
        return float(achado.group(1).replace(",", ".")), None, "peso", None
    if chave == "kg":
        return 1.0, None, "peso", None
    raise ValueError("unidade não reconhecida: %r" % unidade)


def arred(valor, casas=4):
    arredondado = round(valor, casas)
    return int(arredondado) if arredondado == int(arredondado) else arredondado


def medias_mensais(datas, precos):
    acumulado = OrderedDict()
    for data, preco in zip(datas, precos):
        if preco is None:
            continue
        acumulado.setdefault(data[:7], []).append(preco)
    return OrderedDict((mes, arred(sum(v) / len(v))) for mes, v in acumulado.items())


def estatisticas(precos):
    serie = [p for p in precos if p is not None]
    media = sum(serie) / len(serie)
    # Desvio-padrão amostral, como na aba de estatísticas da planilha de origem.
    desvio = (sum((p - media) ** 2 for p in serie) / (len(serie) - 1)) ** 0.5 if len(serie) > 1 else 0
    return OrderedDict([
        ("n_observacoes", len(serie)),
        ("minimo", arred(min(serie))),
        ("maximo", arred(max(serie))),
        ("media", arred(media)),
        ("cv", arred(desvio / media if media else 0)),
        ("n_mudancas", sum(1 for a, b in zip(serie, serie[1:]) if a != b)),
    ])


def bloco_de_serie(datas, unidades, precos):
    """Monta o bloco de um canal a partir dos preços na unidade de origem.

    `unidades` traz a unidade de cada data. Quase sempre é uma só; em sete
    produtos do varejo a unidade de venda muda no meio da série, e aí a série
    deixa de ser uma série: vira trechos que não se comparam entre si. O bloco
    guarda os trechos e não publica média nem conversão global, porque média de
    preço por cabeça com preço por quilo não significa nada.
    """
    distintas = []
    for u in unidades:
        if not distintas or distintas[-1] != u:
            distintas.append(u)
    variou = len(set(unidades)) > 1

    bloco = OrderedDict()
    if not variou:
        unidade = unidades[0]
        fator, itens, tipo, peca = analisar_unidade(unidade)
        bloco["unidade_origem"] = unidade
        bloco["tipo_unidade"] = tipo
        bloco["peca_contada"] = peca
        bloco["fator_conversao_kg"] = arred(fator) if fator else None
        bloco["itens_por_unidade"] = itens
        bloco["unidade_variou"] = False
        bloco["base_comparacao"] = "kg" if fator else "unidade:" + normalizar_nome(unidade)
        bloco["precos_unidade_origem"] = [arred(p) for p in precos]
        if fator:
            em_kg = [arred(p / fator) for p in precos]
            bloco["precos_rs_kg"] = em_kg
            bloco["medias_mensais_rs_kg"] = medias_mensais(datas, em_kg)
            bloco["estatisticas_rs_kg"] = estatisticas(em_kg)
        else:
            bloco["precos_rs_kg"] = None
            bloco["medias_mensais_unidade_origem"] = medias_mensais(datas, precos)
            bloco["estatisticas_unidade_origem"] = estatisticas(precos)
        return bloco

    bloco["unidade_origem"] = " → ".join(distintas)
    bloco["tipo_unidade"] = "mista"
    bloco["peca_contada"] = None
    bloco["fator_conversao_kg"] = None
    bloco["itens_por_unidade"] = None
    bloco["unidade_variou"] = True
    bloco["base_comparacao"] = "mista"
    bloco["unidades_por_data"] = list(unidades)
    bloco["precos_unidade_origem"] = [arred(p) for p in precos]
    bloco["precos_rs_kg"] = None

    trechos = []
    inicio = 0
    for fim in range(1, len(unidades) + 1):
        if fim == len(unidades) or unidades[fim] != unidades[inicio]:
            fatia = precos[inicio:fim]
            trechos.append(OrderedDict([
                ("unidade", unidades[inicio]),
                ("inicio", datas[inicio]),
                ("fim", datas[fim - 1]),
                ("indice_inicio", inicio),
                ("indice_fim", fim - 1),
                ("estatisticas", estatisticas(fatia)),
            ]))
            inicio = fim
    bloco["trechos"] = trechos
    return bloco


def ler_procedencia(planilha):
    """Data → (boletim de origem, realinhada?), lido da aba Série longa."""
    procedencia = {}
    for linha in planilha["Série longa"].iter_rows(min_row=2, values_only=True):
        _, _, data, _, ajuste, boletim = linha
        procedencia[data.date().isoformat()] = (boletim, ajuste not in (None, "—"))
    return procedencia


def ler_atacado():
    """Devolve (datas, boletins, datas_realinhadas, {slug: (rotulo, bloco)})."""
    planilha = openpyxl.load_workbook(PLANILHA, read_only=True, data_only=True)
    linhas = list(planilha["Série larga"].iter_rows(values_only=True))
    procedencia = ler_procedencia(planilha)

    datas = sorted(procedencia)
    if len(datas) != len(linhas[0]) - 2:
        raise SystemExit("as duas abas da planilha discordam no número de datas")

    boletins = OrderedDict()
    for data in datas:
        boletins.setdefault(procedencia[data][0], []).append(data)

    series = OrderedDict()
    for linha in linhas[1:]:
        rotulo, unidade = linha[0], linha[1]
        if not rotulo or not unidade:
            continue  # rodapé de notas da planilha
        precos = list(linha[2:])
        if any(p is None for p in precos):
            raise SystemExit("série de atacado incompleta em %s" % rotulo)
        bloco = bloco_de_serie(datas, [unidade.strip()] * len(datas), precos)
        series[slug(rotulo)] = (rotulo, bloco)

    return datas, boletins, [d for d in datas if procedencia[d][1]], series


def ler_mercado_central(rotulos_atacado):
    """Lê o CSV longo do Mercado Central.

    Devolve (datas, boletins, {slug: (rotulo, bloco)}). Duas datas aparecem em
    dois boletins cada, porque as janelas publicadas se sobrepõem; os valores
    coincidem, e a leitura repetida é descartada em vez de virar coleta a mais.
    """
    with MERCADO_CENTRAL.open(encoding="utf-8") as arquivo:
        linhas = list(csv.DictReader(arquivo))

    observacoes = {}
    boletins = OrderedDict()
    for linha in linhas:
        data, produto = linha["data"], linha["produto"]
        registro = (linha["unidade"].strip(), float(linha["preco"]))
        anterior = observacoes.get((data, produto))
        if anterior and anterior != registro:
            raise SystemExit("leituras conflitantes em %s, %s: %r vs %r"
                             % (produto, data, anterior, registro))
        observacoes[(data, produto)] = registro
        boletins.setdefault(linha["arquivo"], set()).add(data)

    datas = sorted({d for d, _ in observacoes})
    produtos = sorted({p for _, p in observacoes})

    series = OrderedDict()
    for produto in produtos:
        faltando = [d for d in datas if (d, produto) not in observacoes]
        if faltando:
            raise SystemExit("%s sem preço em %d datas" % (produto, len(faltando)))
        unidades = [observacoes[(d, produto)][0] for d in datas]
        precos = [observacoes[(d, produto)][1] for d in datas]
        series[chave_de_varejo(produto, rotulos_atacado)] = (produto, bloco_de_serie(datas, unidades, precos))

    boletins = OrderedDict((arquivo, sorted(datas))
                           for arquivo, datas in sorted(boletins.items(), key=lambda kv: min(kv[1])))
    return datas, boletins, series


def chave_de_varejo(produto, rotulos_atacado):
    """Slug do produto de varejo: o mesmo do atacado quando é o mesmo produto."""
    if produto in PAREAMENTOS:
        return PAREAMENTOS[produto]
    normalizado = normalizar_nome(produto)
    if normalizado in rotulos_atacado:
        return rotulos_atacado[normalizado]
    return slug(ROTULOS_VAREJO.get(produto, produto.title()))


def main():
    datas_atacado, boletins_atacado, realinhadas, series_atacado = ler_atacado()

    produtos = OrderedDict()
    rotulos_atacado = {}
    for chave, (rotulo, bloco) in series_atacado.items():
        produtos[chave] = OrderedDict([
            ("label", ROTULOS_FIXOS.get(rotulo, rotulo)),
            ("grupo", "animal" if rotulo in PRODUTOS_ANIMAIS else "vegetal"),
            (CANAL_ATACADO, bloco),
        ])
        rotulos_atacado[normalizar_nome(produtos[chave]["label"])] = chave

    datas_mc, boletins_mc, series_mc = ler_mercado_central(rotulos_atacado)
    animais_varejo = set()
    with MERCADO_CENTRAL.open(encoding="utf-8") as arquivo:
        for linha in csv.DictReader(arquivo):
            if linha["grupo"] == "Origem animal":
                animais_varejo.add(linha["produto"])

    for chave, (rotulo, bloco) in series_mc.items():
        if chave not in produtos:
            produtos[chave] = OrderedDict([
                ("label", ROTULOS_VAREJO.get(rotulo, rotulo.title())),
                ("grupo", "animal" if rotulo in animais_varejo else "vegetal"),
            ])
        produtos[chave][CANAL_MC] = bloco

    # Augusto Franco continua vindo da consolidação do primeiro trimestre: é o
    # único canal ainda sem reconsolidação a partir dos boletins.
    augusto = json.loads(AUGUSTO_FRANCO.read_text(encoding="utf-8"))
    datas_af = augusto["meta"]["canais"][CANAL_AF]["datas"]
    for chave, ficha in augusto["produtos"].items():
        origem = ficha.get(CANAL_AF)
        if not origem:
            continue
        if chave not in produtos:
            raise SystemExit("produto de varejo sem correspondência: %s" % chave)
        fator = origem["fator_conversao_kg"]
        precos = [p * fator for p in origem["precos_rs_kg"]]
        unidade = origem["unidade_origem"].strip()
        produtos[chave][CANAL_AF] = bloco_de_serie(datas_af, [unidade] * len(datas_af), precos)

    produtos = OrderedDict(sorted(produtos.items(), key=lambda kv: normalizar_nome(kv[1]["label"])))

    canais = OrderedDict()
    canais[CANAL_ATACADO] = OrderedDict([
        ("label", ROTULOS_CANAL[CANAL_ATACADO]),
        ("label_curto", ROTULOS_CURTOS[CANAL_ATACADO]),
        ("descricao", "Atacado CEASA-SE, Centrais de Abastecimento de Sergipe (Aracaju)"),
        ("frequencia", "boletim semanal com 2 a 3 coletas por semana; não é série diária"),
        ("janela", "2026-01 a 2026-07"),
        ("n_datas", len(datas_atacado)),
        ("n_produtos", len(series_atacado)),
        ("datas", datas_atacado),
        ("nota", "Preços originais por embalagem (caixa, saco, arroba) convertidos para R$/kg "
                 "pelo peso nominal da embalagem."),
        ("feriados_sem_coleta", FERIADOS),
        ("lacunas", ["Não há boletim publicado entre 16/04 e 05/05 de 2026."]),
        ("datas_realinhadas", realinhadas),
        ("nota_realinhamento",
         "Os boletins de 11/16/18 e de 23/25/30 de junho saíram com a coluna de nomes de produto "
         "reordenada sem que as colunas numéricas acompanhassem, e cada linha impressa exibia o "
         "preço de outro produto. Os valores foram realinhados para a ordem padrão e conferidos "
         "contra o boletim íntegro de 2/9/11 de junho na data coberta pelos dois (11/06): "
         "coincidem em 54 de 54 produtos. O realinhamento é inferência verificada, não "
         "confirmação da fonte."),
        ("boletins", boletins_atacado),
    ])
    canais[CANAL_MC] = OrderedDict([
        ("label", ROTULOS_CANAL[CANAL_MC]),
        ("label_curto", ROTULOS_CURTOS[CANAL_MC]),
        ("descricao", "Varejo Mercado Maria Virgínia Leite Franco (Mercado Central de Aracaju)"),
        ("frequencia", "boletim semanal com 2 a 3 coletas por semana; não é série diária"),
        ("janela", "2026-01 a 2026-07"),
        ("n_datas", len(datas_mc)),
        ("n_produtos", len(series_mc)),
        ("datas", datas_mc),
        ("nota", "Mercado popular com preços próximos do atacado: canal híbrido, não proxy de "
                 "supermercado. Em sete produtos a unidade de venda muda ao longo do período, e "
                 "esses trechos não se comparam entre si."),
        ("boletins", boletins_mc),
    ])
    origem_af = augusto["meta"]["canais"][CANAL_AF]
    canais[CANAL_AF] = OrderedDict([
        ("label", ROTULOS_CANAL[CANAL_AF]),
        ("label_curto", ROTULOS_CURTOS[CANAL_AF]),
        ("descricao", origem_af["descricao"]),
        ("frequencia", origem_af["frequencia"]),
        ("janela", "2026-01 a 2026-03"),
        ("n_datas", origem_af["n_datas"]),
        ("n_produtos", sum(1 for p in produtos.values() if CANAL_AF in p)),
        ("datas", datas_af),
        ("nota", origem_af.get("nota", "")),
    ])

    documento = OrderedDict([
        ("meta", OrderedDict([
            ("fonte", "EMDAGRO, Empresa de Desenvolvimento Agropecuário de Sergipe / ASPLAN"),
            ("serie", "Preços médios de atacado e varejo, Aracaju"),
            ("janela", "2026-01 a 2026-07"),
            ("geracao", GERACAO),
            ("unidade_padrao", "R$/kg"),
            ("n_produtos", len(produtos)),
            ("unidades", "Preço na unidade de origem do boletim. A conversão para R$/kg usa o "
                         "peso nominal da embalagem. Produtos cotados por peça — cento, dúzia, "
                         "molho, pé, cabeça — ficam sem conversão: a fonte não publica peso por "
                         "peça. Dois canais só entram no mesmo gráfico quando compartilham a "
                         "unidade de comparação, declarada em base_comparacao."),
            ("canais", canais),
            ("arquivos_de_origem", OrderedDict([
                (CANAL_ATACADO, "dados/fontes/precos-atacado-ceasa-se-consolidado-v3.xlsx"),
                (CANAL_MC, "dados/fontes/emdagro-mercado-central-precos-diarios-2026.csv"),
                (CANAL_AF, "dados/precos-emdagro-q1-2026.json"),
            ])),
        ])),
        ("produtos", produtos),
    ])

    SAIDA.write_text(json.dumps(documento, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def conta(canal):
        return sum(1 for p in produtos.values() if canal in p)

    print("%s: %d produtos" % (SAIDA.relative_to(RAIZ), len(produtos)))
    print("  atacado CEASA-SE      %2d produtos · %d coletas" % (conta(CANAL_ATACADO), len(datas_atacado)))
    print("  varejo Mercado Central %2d produtos · %d coletas" % (conta(CANAL_MC), len(datas_mc)))
    print("  varejo Augusto Franco  %2d produtos · %d coletas" % (conta(CANAL_AF), len(datas_af)))
    variaveis = [p["label"] for p in produtos.values()
                 if any(c in p and p[c].get("unidade_variou") for c in (CANAL_ATACADO, CANAL_MC, CANAL_AF))]
    print("  unidade variável em %d produtos: %s" % (len(variaveis), ", ".join(variaveis)))


if __name__ == "__main__":
    main()
