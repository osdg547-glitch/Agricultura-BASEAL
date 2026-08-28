#!/usr/bin/env python3
"""Gera dados/series-precos-se-2026.json, a série que a página /produtos/ lê.

Junta duas fontes num arquivo só:

  atacado  dados/fontes/precos-atacado-ceasa-se-consolidado-v3.xlsx
           54 produtos, 48 coletas de jan a jul de 2026, transcrição dos
           boletins "Preços médios de atacado - CEASA" da EMDAGRO/ASPLAN.

  varejo   dados/precos-emdagro-q1-2026.json
           11 produtos, 23 coletas de jan a mar de 2026, nos dois pontos de
           varejo do mesmo boletim: Mercado Central e Augusto Franco.

Cada canal guarda a própria lista de datas, porque as coletas não coincidem e a
janela do varejo é mais curta. O script não corrige, não interpola e não estima:
o que não está na fonte não é escrito.

Dependência: openpyxl (pip install openpyxl). Só é necessária para reimportar a
planilha; o site consome apenas o JSON gerado.

Uso:
    python3 scripts/importar-series-precos.py
"""

import json
import re
import unicodedata
from collections import OrderedDict
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
PLANILHA = RAIZ / "dados" / "fontes" / "precos-atacado-ceasa-se-consolidado-v3.xlsx"
VAREJO = RAIZ / "dados" / "precos-emdagro-q1-2026.json"
SAIDA = RAIZ / "dados" / "series-precos-se-2026.json"

GERACAO = "2026-08-28"

CANAIS_VAREJO = ("varejo_mercado_central", "varejo_augusto_franco")

# Datas que aparecem no cabeçalho dos boletins marcadas como feriado, sem preço
# publicado. Não entram na série.
FERIADOS = ["2026-04-02", "2026-04-21", "2026-06-04"]

# Os sete últimos produtos do boletim formam o bloco de origem animal.
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

# Unidades de contagem: o boletim cota por peça, não por peso. Sem peso nominal
# publicado pela fonte, converter para R$/kg seria inventar número.
UNIDADES_CONTAGEM = {
    "cento": (100, "unidade"),
    "cx 30 dz": (360, "unidade"),
}

ROTULOS_CANAL = {
    "atacado_ceasa": "Atacado CEASA-SE",
    "varejo_mercado_central": "Varejo Mercado Central",
    "varejo_augusto_franco": "Varejo Augusto Franco",
}

# Nome curto para onde a largura é apertada, como o cabeçalho dos cartões.
ROTULOS_CURTOS = {
    "atacado_ceasa": "CEASA-SE",
    "varejo_mercado_central": "Mercado Central",
    "varejo_augusto_franco": "Augusto Franco",
}


def slug(rotulo):
    if rotulo in SLUGS_FIXOS:
        return SLUGS_FIXOS[rotulo]
    sem_acento = unicodedata.normalize("NFKD", rotulo).encode("ascii", "ignore").decode()
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", sem_acento.lower())).strip("_")


def analisar_unidade(unidade):
    """Devolve (fator_kg, itens_por_unidade, tipo) para a unidade do boletim.

    fator_kg é None quando a unidade é de contagem: nesse caso o preço fica na
    unidade de origem e a página precisa dizer isso ao leitor.
    """
    chave = unidade.strip().lower()
    if chave in UNIDADES_CONTAGEM:
        itens, tipo = UNIDADES_CONTAGEM[chave]
        return None, itens, tipo
    achado = re.search(r"(\d+(?:[.,]\d+)?)\s*kg", chave)
    if achado:
        return float(achado.group(1).replace(",", ".")), None, "peso"
    if chave == "kg":
        return 1.0, None, "peso"
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
    desvio = (sum((p - media) ** 2 for p in serie) / (len(serie) - 1)) ** 0.5
    return OrderedDict([
        ("n_observacoes", len(serie)),
        ("minimo", arred(min(serie))),
        ("maximo", arred(max(serie))),
        ("media", arred(media)),
        ("cv", arred(desvio / media if media else 0)),
        ("n_mudancas", sum(1 for a, b in zip(serie, serie[1:]) if a != b)),
    ])


def bloco_de_serie(unidade, precos, datas):
    """Monta o bloco de um canal a partir dos preços na unidade de origem."""
    fator, itens, tipo = analisar_unidade(unidade)
    bloco = OrderedDict([
        ("unidade_origem", unidade.strip()),
        ("tipo_unidade", tipo),
        ("fator_conversao_kg", arred(fator) if fator else None),
        ("itens_por_unidade", itens),
        ("precos_unidade_origem", [arred(p) for p in precos]),
    ])
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
        series[slug(rotulo)] = (rotulo, bloco_de_serie(unidade, precos, datas))

    return datas, boletins, [d for d in datas if procedencia[d][1]], series


def main():
    datas_atacado, boletins, realinhadas, series_atacado = ler_atacado()
    varejo = json.loads(VAREJO.read_text(encoding="utf-8"))

    produtos = OrderedDict()
    for chave, (rotulo, bloco) in series_atacado.items():
        produtos[chave] = OrderedDict([
            ("label", ROTULOS_FIXOS.get(rotulo, rotulo)),
            ("grupo", "animal" if rotulo in PRODUTOS_ANIMAIS else "vegetal"),
            ("atacado_ceasa", bloco),
        ])

    # Varejo: mesmos slugs, janela mais curta, só os 11 produtos com coleta.
    for chave, ficha in varejo["produtos"].items():
        if chave not in produtos:
            raise SystemExit("produto de varejo sem correspondência no atacado: %s" % chave)
        for canal in CANAIS_VAREJO:
            origem = ficha.get(canal)
            if not origem:
                continue
            datas_canal = varejo["meta"]["canais"][canal]["datas"]
            fator = origem["fator_conversao_kg"]
            precos = [p * fator for p in origem["precos_rs_kg"]]
            produtos[chave][canal] = bloco_de_serie(origem["unidade_origem"], precos, datas_canal)

    canais = OrderedDict()
    canais["atacado_ceasa"] = OrderedDict([
        ("label", ROTULOS_CANAL["atacado_ceasa"]),
        ("label_curto", ROTULOS_CURTOS["atacado_ceasa"]),
        ("descricao", "Atacado CEASA-SE, Centrais de Abastecimento de Sergipe (Aracaju)"),
        ("frequencia", "boletim semanal com 2 a 3 coletas por semana; não é série diária"),
        ("janela", "2026-01 a 2026-07"),
        ("n_datas", len(datas_atacado)),
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
        ("boletins", boletins),
    ])
    for canal in CANAIS_VAREJO:
        origem = varejo["meta"]["canais"][canal]
        canais[canal] = OrderedDict([
            ("label", ROTULOS_CANAL[canal]),
            ("label_curto", ROTULOS_CURTOS[canal]),
            ("descricao", origem["descricao"]),
            ("frequencia", origem["frequencia"]),
            ("janela", "2026-01 a 2026-03"),
            ("n_datas", origem["n_datas"]),
            ("datas", origem["datas"]),
            ("nota", origem.get("nota", "")),
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
                         "peso nominal da embalagem. Produtos cotados por cento ou por caixa de "
                         "dúzias ficam sem conversão: a fonte não publica peso por peça."),
            ("canais", canais),
            ("arquivos_de_origem", OrderedDict([
                ("atacado_ceasa", "dados/fontes/precos-atacado-ceasa-se-consolidado-v3.xlsx"),
                ("varejo", "dados/precos-emdagro-q1-2026.json"),
            ])),
        ])),
        ("produtos", produtos),
    ])

    SAIDA.write_text(json.dumps(documento, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    com_varejo = sum(1 for p in produtos.values() if any(c in p for c in CANAIS_VAREJO))
    print("%s: %d produtos (%d com varejo), %d datas de atacado"
          % (SAIDA.relative_to(RAIZ), len(produtos), com_varejo, len(datas_atacado)))


if __name__ == "__main__":
    main()
