/* ============================================================
   cobweb · sparklines de preço no atacado
   ============================================================
   Preenche os SVGs marcados com data-spark dentro de qualquer
   contêiner que declare data-sparklines com o caminho do JSON de
   preços. Cada card informa o produto em data-produto.

   Uma requisição por contêiner, sem dependência externa. As
   dimensões saem do próprio viewBox, de modo que o mesmo script
   serve a sparklines de tamanhos diferentes.
   ============================================================ */

(function () {
  'use strict';

  const containers = document.querySelectorAll('[data-sparklines]');
  if (!containers.length) return;

  /* As cores saem dos tokens do cobweb.css, que já resolvem o tema claro e o
     escuro — nada de matiz hardcoded aqui. */
  const tokens = getComputedStyle(document.documentElement);
  const token = function (nome, reserva) {
    return (tokens.getPropertyValue(nome) || '').trim() || reserva;
  };
  const COR_ALTA   = token('--color-serie-alta', '#1d9e75');
  const COR_BAIXA  = token('--color-serie-baixa', '#a0762a');
  const COR_NEUTRA = token('--color-serie-estavel', '#b4b2a9');

  containers.forEach(function (container) {
    const fonte = container.dataset.sparklines;

    fetch(fonte)
      .then(function (r) { return r.json(); })
      .then(function (dados) {
        container.querySelectorAll('[data-produto]').forEach(function (card) {
          desenhar(card, dados);
        });
      })
      .catch(function (e) { console.warn('CobWeb: sparklines não carregadas de ' + fonte, e); });
  });

  function desenhar(card, dados) {
    const bloco = dados.produtos && dados.produtos[card.dataset.produto];
    if (!bloco || !bloco.atacado_ceasa) return;

    const serie = bloco.atacado_ceasa.precos_rs_kg.filter(function (v) { return v !== null; });
    if (serie.length < 2) return;

    const svg = card.querySelector('[data-spark]');
    if (!svg) return;

    /* O viewBox define a caixa de desenho; a folga vertical evita que a linha
       encoste na borda nos extremos da série. */
    const caixa = (svg.getAttribute('viewBox') || '0 0 72 40').split(/\s+/).map(Number);
    const W = caixa[2], H = caixa[3], PAD_X = 2, PAD_Y = 3;

    const min = Math.min.apply(null, serie);
    const max = Math.max.apply(null, serie);
    const range = max - min;

    /* Série constante não tem amplitude para normalizar: a linha vai para o
       meio da caixa, e não para o piso, que leria como ausência de dado. */
    const pts = serie.map(function (v, i) {
      const x = PAD_X + (i / (serie.length - 1)) * (W - 2 * PAD_X);
      const y = range === 0
        ? H / 2
        : PAD_Y + (1 - (v - min) / range) * (H - 2 * PAD_Y);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });

    /* Cor da linha: verde se subiu, âmbar se caiu, cinza se estável */
    const primeira = serie[0], ultima = serie[serie.length - 1];
    const cor = ultima > primeira * 1.02 ? COR_ALTA
              : ultima < primeira * 0.98 ? COR_BAIXA
              : COR_NEUTRA;

    /* Área de preenchimento sob a linha */
    const priPt = pts[0].split(',');
    const ultPt = pts[pts.length - 1].split(',');
    const area = 'M ' + priPt[0] + ',' + (H - PAD_Y)
               + ' L ' + pts.join(' L ')
               + ' L ' + ultPt[0] + ',' + (H - PAD_Y) + ' Z';

    svg.innerHTML =
      '<path d="' + area + '" fill="' + cor + '" opacity="0.10"/>'
      + '<polyline points="' + pts.join(' ') + '" fill="none"'
      + ' stroke="' + cor + '" stroke-width="1.8"'
      + ' stroke-linejoin="round" stroke-linecap="round"/>';
  }
})();
