/* ============================================================
   cobweb · Platô de Neópolis · produção e área
   ============================================================
   Gráfico A: Platô contra o resto de Sergipe, 2001 a 2025, em
   quantidade produzida (padrão) ou área colhida.
   Gráfico B: área destinada à colheita contra área colhida no
   Platô. A distância entre as duas linhas é pomar plantado que
   ainda não entrou em produção.

   Fonte: dados/limao-plato.json, séries plato e resto_se.
   ============================================================ */

(function () {
  'use strict';

  const L = window.CobWebLimao;
  const canvasA = document.getElementById('limao-producao');
  const canvasB = document.getElementById('limao-areas');
  if (!L || typeof Chart === 'undefined' || (!canvasA && !canvasB)) return;

  const fonte = (canvasA || canvasB).dataset.fonte;

  L.carregar(fonte)
    .then(function (d) {
      if (canvasA) graficoA(canvasA, d);
      if (canvasB) graficoB(canvasB, d);
    })
    .catch(function (e) { console.warn('CobWeb: ' + e.message); });

  function graficoA(canvas, d) {
    const wrapper = document.getElementById('limao-producao-wrapper');
    const c = L.cores();

    const series = {
      qtd:  { campo: 'quantidade_t',    unidade: 't',  rotulo: 'quantidade produzida' },
      area: { campo: 'area_colhida_ha', unidade: 'ha', rotulo: 'área colhida' }
    };
    let ativa = 'qtd';

    function conjuntos(chave) {
      const campo = series[chave].campo;
      return [
        {
          label:            'Platô de Neópolis',
          data:             d.series.plato[campo],
          borderColor:      c.marca,
          backgroundColor:  c.marca,
          borderWidth:      2,
          pointRadius:      0,
          pointHoverRadius: 4,
          tension:          0.2
        },
        {
          label:            'Resto de Sergipe',
          data:             d.series.resto_se[campo],
          borderColor:      c.neutro,
          backgroundColor:  c.neutro,
          borderWidth:      2,
          borderDash:       [6, 4],
          pointRadius:      0,
          pointHoverRadius: 4,
          tension:          0.2
        }
      ];
    }

    const chart = new Chart(canvas, {
      type: 'line',
      data: { labels: d.anos, datasets: conjuntos(ativa) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: L.legenda(c),
          tooltip: Object.assign(L.tooltip(c), {
            callbacks: {
              label: function (item) {
                if (item.parsed.y === null) return item.dataset.label + ': sem dado';
                return item.dataset.label + ': ' + L.nf0.format(item.parsed.y) + ' ' + series[ativa].unidade;
              }
            }
          })
        },
        scales: {
          x: L.eixoX(c),
          y: L.eixoY(c, function (v) { return L.milhar(v) + ' ' + series[ativa].unidade; }, { min: 0 })
        }
      }
    });

    L.alternar(wrapper, 'serie', function (chave) {
      ativa = chave;
      chart.data.datasets = conjuntos(chave);
      chart.update();
    });
  }

  function graficoB(canvas, d) {
    const c = L.cores();
    const p = d.series.plato;

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: d.anos,
        datasets: [
          {
            label:            'Área colhida',
            data:             p.area_colhida_ha,
            borderColor:      c.marca,
            backgroundColor:  c.marca,
            borderWidth:      2,
            pointRadius:      0,
            pointHoverRadius: 4,
            tension:          0
          },
          {
            label:            'Área destinada à colheita',
            data:             p.area_destinada_ha,
            borderColor:      c.neutro,
            backgroundColor:  c.neutro,
            borderWidth:      2,
            borderDash:       [6, 4],
            pointRadius:      0,
            pointHoverRadius: 4,
            tension:          0
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
                if (item.parsed.y === null) return item.dataset.label + ': sem dado';
                return item.dataset.label + ': ' + L.nf0.format(item.parsed.y) + ' ha';
              },
              /* A diferença é o que o gráfico existe para mostrar; entra no
                 rodapé do tooltip só quando é positiva. */
              footer: function (itens) {
                const i = itens[0].dataIndex;
                const dif = p.area_destinada_ha[i] - p.area_colhida_ha[i];
                return dif > 0 ? 'Ainda sem colheita: ' + L.nf0.format(dif) + ' ha' : '';
              }
            }
          })
        },
        scales: {
          x: L.eixoX(c),
          y: L.eixoY(c, function (v) { return L.nf0.format(v) + ' ha'; }, { min: 0 })
        }
      }
    });
  }
})();
