/* ============================================================
   cobweb · Platô de Neópolis · rendimento e calendário
   ============================================================
   Gráfico E: rendimento médio (kg/ha) do Platô, de Sergipe, de São
   Paulo e do Brasil, 2001 a 2025. O Platô na cor de marca; as três
   comparações em cinza, distinguidas pelo traço.

   Gráfico F: calendário de embarques. Participação de cada mês no
   volume exportado do período, 2016–2019 contra 2023–2025, em
   barras agrupadas de janeiro a dezembro.

   Fonte: dados/limao-plato.json, series.*.rendimento_kg_ha e
   calendario_embarques.
   ============================================================ */

(function () {
  'use strict';

  const L = window.CobWebLimao;
  const canvasE = document.getElementById('limao-rendimento');
  const canvasF = document.getElementById('limao-calendario');
  if (!L || typeof Chart === 'undefined' || (!canvasE && !canvasF)) return;

  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  L.carregar((canvasE || canvasF).dataset.fonte)
    .then(function (d) {
      if (canvasE) graficoE(canvasE, d);
      if (canvasF) graficoF(canvasF, d);
    })
    .catch(function (e) { console.warn('CobWeb: ' + e.message); });

  function linha(rotulo, dados, cor, traco) {
    return {
      label:            rotulo,
      data:             dados,
      borderColor:      cor,
      backgroundColor:  cor,
      borderWidth:      2,
      borderDash:       traco,
      pointRadius:      0,
      pointHoverRadius: 4,
      tension:          0.2
    };
  }

  function graficoE(canvas, d) {
    const c = L.cores();
    const s = d.series;

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: d.anos,
        datasets: [
          linha('Platô de Neópolis', s.plato.rendimento_kg_ha, c.marca, []),
          linha('São Paulo', s.sao_paulo.rendimento_kg_ha, c.neutro, [6, 4]),
          linha('Brasil', s.brasil.rendimento_kg_ha, c.neutro, [2, 3]),
          linha('Sergipe', s.sergipe.rendimento_kg_ha, c.neutro, [10, 3, 2, 3])
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: L.legenda(c),
          tooltip: Object.assign(L.tooltip(c), {
            itemSort: function (a, b) { return b.parsed.y - a.parsed.y; },
            callbacks: {
              label: function (item) {
                if (item.parsed.y === null) return item.dataset.label + ': sem dado';
                return item.dataset.label + ': ' + L.nf0.format(item.parsed.y) + ' kg/ha';
              }
            }
          })
        },
        scales: {
          x: L.eixoX(c),
          y: L.eixoY(c, function (v) { return L.milhar(v) + ' kg/ha'; }, { min: 0 })
        }
      }
    });
  }

  function graficoF(canvas, d) {
    const c = L.cores();
    const cal = d.calendario_embarques;
    const periodos = Object.keys(cal);
    /* O período mais antigo em cinza, o mais recente na cor de marca. */
    const estilos = [
      { fundo: c.neutroFundo, borda: c.neutro },
      { fundo: c.marca, borda: c.marca }
    ];

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: MESES,
        datasets: periodos.map(function (p, i) {
          const e = estilos[Math.min(i, estilos.length - 1)];
          return {
            label:           p,
            data:            cal[p].map(function (v) { return v === null ? null : v * 100; }),
            backgroundColor: e.fundo,
            borderColor:     e.borda,
            borderWidth:     1
          };
        })
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
                return item.dataset.label + ': ' + L.nf1.format(item.parsed.y) + '% do volume';
              }
            }
          })
        },
        scales: {
          x: L.eixoX(c),
          y: L.eixoY(c, function (v) { return L.nf0.format(v) + '%'; }, { min: 0 })
        }
      }
    });
  }
})();
