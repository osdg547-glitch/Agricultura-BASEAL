#!/usr/bin/env python3
"""
Carimba uma versão nos links de CSS e JS locais de todas as páginas.

Sem etapa de build, o navegador e o CDN do GitHub Pages seguram a versão
antiga do cobweb.css por horas depois de um deploy — e uma página nova
com um CSS velho quebra em silêncio. Trocar o endereço do arquivo a cada
mudança resolve: URL nova, cache novo.

Uso:
    python3 scripts/versionar-assets.py                 # carimba data e hora
    python3 scripts/versionar-assets.py 20260804-1600   # carimba uma versão dada

Rode sempre que mexer em cobweb.css ou em assets/js/.
"""

import datetime
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

# Só assets locais: a folha de estilo, os scripts e os JSON de dados lidos por
# fetch. Fontes e Chart.js vêm de CDN e já têm versão no próprio caminho.
ALVO = re.compile(
    r'((?:href|src|data-fonte|data-sparklines)="(?:\.\./)*'
    r'(?:cobweb\.css|assets/js/[\w-]+\.js|dados/[\w-]+\.json))(?:\?v=[^"]*)?"')


def main():
    # Data e hora, não só data: mais de um deploy no mesmo dia precisa de
    # endereços diferentes para vencer o cache.
    versao = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now().strftime('%Y%m%d-%H%M')

    paginas = sorted(RAIZ.rglob('*.html'))
    tocadas = 0

    for pagina in paginas:
        original = pagina.read_text(encoding='utf-8')
        novo = ALVO.sub(lambda m: m.group(1) + '?v=' + versao + '"', original)
        if novo != original:
            pagina.write_text(novo, encoding='utf-8')
            tocadas += 1

    print(f'versão {versao} carimbada em {tocadas} de {len(paginas)} páginas')


if __name__ == '__main__':
    main()
