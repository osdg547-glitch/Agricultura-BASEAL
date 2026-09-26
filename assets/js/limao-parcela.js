/* ============================================================
   cobweb · Platô de Neópolis · parcela exportada
   ============================================================
   Gráfico C, 2016 a 2025: barras com a produção do Platô e a
   exportação sergipana de 080550, em toneladas, no eixo esquerdo;
   linha com a parcela exportada, em %, no eixo direito.

   A janela começa em 2016 porque a exportação só está disponível
   dali em diante (null nos anos anteriores). A parcela vem pronta
   do JSON e supõe que toda a exportação de 080550 de Sergipe sai
   do Platô; a nota abaixo do gráfico diz isso ao leitor.

   Fonte: dados/limao-plato.json, series.plato e exportacao.
   ============================================================ */

(function () {
  'use strict';

  const L = window.CobWebLimao;
  const canvas = document.getElementById('limao-parcela');
  if (!L || !canvas || typeof Chart === 'undefined') return;

  L.carregar(canvas.dataset.fonte)
    .then(desenhar)
    .catch(function (e) { console.warn('CobWeb: ' + e.message); });

  function desenhar(d) {
    const c = L.cores();

    /* Primeiro ano com exportação informada. */
    const ini = d.exportacao.t.findIndex(function (v) { return v !== null; });
    const anos = d.anos.slice(ini);
    const producao = d.series.plato.quantidade_t.slice(ini);
    const exportacao = d.exportacao.t.slice(ini);
    const parcela = d.exportacao.parcela_exportada_plato.slice(ini).map(function (v) {
      return v === null ? null : v * 100;
    });

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: anos,
        datasets: [
          {
            type:            'line',
            label:           'Parcela exportada (%)',
            data:            parcela,
            borderColor:     c.negativo,
            backgroundColor: c.negativo,
            borderWidth:     2,
            pointRadius:     3,
            pointHoverRadius: 5,
            tension:         0,
            spanGaps:        false,
            yAxisID:         'yPct',
            order:           0
          },
          {
            label:           'Produção do Platô (t)',
            data:            producao,
            backgroundColor: c.neutroFundo,
            borderColor:     c.neutro,
            borderWidth:     1,
            yAxisID:         'yT',
            order:           1
          },
          {
            label:           'Exportação de SE, 080550 (t)',
            data:            exportacao,
            backgroundColor: c.marcaFundo,
            borderColor:     c.marca,
            borderWidth:     1.5,
            yAxisID:         'yT',
            order:           1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: L.legenda(c),
          tooltip: Object.assign(L.tooltip(c), {
            callbacks: {
              label: function (item) {
                const v = item.parsed.y;
                const nome = item.dataset.label.replace(/ \(.*\)$/, '');
                if (v === null) return nome + ': sem dado';
                if (item.dataset.yAxisID === 'yPct') return nome + ': ' + L.nf1.format(v) + '%';
                return nome + ': ' + L.nf0.format(v) + ' t';
              }
            }
          })
        },
        scales: {
          x: L.eixoX(c),
          yT: L.eixoY(c, function (v) { return L.milhar(v) + ' t'; }, { position: 'left', min: 0 }),
          yPct: {
            position: 'right',
            min:      0,
            grid:     { display: false },
            ticks:    {
              color: c.textoFraco,
              font:  { size: 11 },
              callback: function (v) { return L.nf0.format(v) + '%'; }
            },
            border:   { display: false }
          }
        }
      }
    });
  }
})();
