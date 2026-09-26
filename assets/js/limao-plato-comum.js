/* ============================================================
   cobweb · Platô de Neópolis · peças comuns aos gráficos
   ============================================================
   Os gráficos do panorama do limão leem o mesmo arquivo,
   dados/limao-plato.json, e compartilham cores, eixos e tooltip.
   Este script carrega o arquivo uma vez e entrega as peças; cada
   gráfico vive no seu próprio arquivo.

   Nada é recalculado aqui: os indicadores (rendimento, parcela
   exportada, decomposição, calendário) já vêm prontos no JSON.
   null é ausência de dado e nunca é desenhado como zero.

   As cores saem dos tokens do cobweb.css, lidos no momento de
   desenhar, para que os dois temas fiquem sempre em sincronia com
   a folha de estilo.
   ============================================================ */

(function (raiz) {
  'use strict';

  let promessa = null;

  /* Um fetch só para todos os gráficos da página. O endereço vem do
     data-fonte do primeiro canvas que pedir o arquivo. */
  function carregar(url) {
    if (!promessa) {
      promessa = fetch(url).then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + url);
        return r.json();
      });
    }
    return promessa;
  }

  function token(nome) {
    return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  }

  /* Hexadecimal do token para rgba com transparência, para preencher
     barras sem criar uma cor nova. */
  function translucido(hex, alfa) {
    const h = hex.replace('#', '');
    if (h.length !== 6) return hex;
    const n = parseInt(h, 16);
    return 'rgba(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + alfa + ')';
  }

  function cores() {
    const marca = token('--color-brand');
    const neutro = token('--color-neutral');
    return {
      marca:        marca,
      marcaFundo:   translucido(marca, 0.22),
      negativo:     token('--color-negative'),
      neutro:       neutro,
      neutroFundo:  translucido(neutro, 0.35),
      texto:        token('--color-text'),
      textoFraco:   token('--color-text-secondary'),
      grade:        token('--color-border'),
      fundo:        token('--color-bg')
    };
  }

  /* Tooltip escuro no tema claro e claro no escuro: é o texto e o
     fundo da página trocados de lugar. */
  function tooltip(c) {
    return {
      backgroundColor: c.texto,
      titleColor:      c.fundo,
      bodyColor:       c.fundo,
      titleFont: { size: 12, weight: '500' },
      bodyFont:  { size: 12 },
      padding:   10
    };
  }

  function legenda(c) {
    return {
      display: true,
      position: 'top',
      align: 'start',
      labels: { color: c.textoFraco, font: { size: 11 }, boxWidth: 20, padding: 14 }
    };
  }

  function eixoX(c) {
    return {
      grid:   { display: false },
      ticks:  { color: c.textoFraco, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 12 },
      border: { color: c.grade }
    };
  }

  function eixoY(c, formatar, extra) {
    return Object.assign({
      grid:   { color: c.grade },
      ticks:  { color: c.textoFraco, font: { size: 11 }, callback: formatar },
      border: { display: false }
    }, extra || {});
  }

  const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function milhar(v) {
    return v >= 1000 ? nf0.format(v / 1000) + ' mil' : nf0.format(v);
  }

  /* Botões .serie-btn dentro de um wrapper. O atributo lido é data-<chave>;
     o callback recebe o valor do botão clicado. */
  function alternar(wrapper, chave, aoMudar) {
    const botoes = wrapper.querySelectorAll('[data-' + chave + ']');
    botoes.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        botoes.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        aoMudar(btn.dataset[chave]);
      });
    });
  }

  raiz.CobWebLimao = {
    carregar: carregar,
    cores: cores,
    tooltip: tooltip,
    legenda: legenda,
    eixoX: eixoX,
    eixoY: eixoY,
    nf0: nf0,
    nf1: nf1,
    milhar: milhar,
    alternar: alternar
  };
})(window);
