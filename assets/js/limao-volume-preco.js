/* ============================================================
   cobweb · limão-taiti — volume, preço implícito e comparativo SH4
   SH6 080550 · Sergipe · 2016–2026
   Fonte de dados: dados/exportacoes-se.json
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('limao-volume-preco');
  const wrapper = document.getElementById('limao-chart-wrapper');
  if (!canvas || !wrapper || typeof Chart === 'undefined') return;

  /* Preços implícitos anuais por SH4 (US$ FOB / kg).
     Computados a partir do Comex Stat (SH6 bruto).
     null = zero exportações no período. */
  const LABELS = ['2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026*'];

  const PRECO_0805 = [1.0329, 0.9222, 0.9808, 0.8879, 0.8000, 0.6273, 1.1564, 1.0722, 0.9393, 0.9526, 1.0349];
  const PRECO_0813 = [23.033, 22.133, 15.480, null, null, null, null, null, null, null, null];
  const PRECO_0804 = [1.1975, 1.1001, 0.9466, null, null, 1.3051, null, null, null, null, null];

  function getColors() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      brand:      dark ? '#5dcaa5' : '#1d9e75',
      brandBg:    dark ? 'rgba(93,202,165,0.22)' : 'rgba(29,158,117,0.15)',
      accent:     dark ? '#c0544a' : '#8b2020',
      neutral:    dark ? '#a09e96' : '#6b6961',
      grid:       dark ? 'rgba(240,238,229,0.08)' : 'rgba(26,26,26,0.08)',
      text:       dark ? '#b4b2a9' : '#888780',
      tooltipBg:  dark ? 'rgba(240,238,229,0.95)' : 'rgba(20,20,20,0.92)',
      tooltipTx:  dark ? '#14140f' : '#ffffff'
    };
  }

  function baseTooltip(c) {
    return {
      backgroundColor: c.tooltipBg,
      titleColor:      c.tooltipTx,
      bodyColor:       c.tooltipTx,
      titleFont: { size: 12, weight: '500' },
      bodyFont:  { size: 12 },
      padding:   10
    };
  }

  function baseXAxis(c) {
    return {
      grid:   { display: false },
      ticks:  { color: c.text, font: { size: 11 }, maxRotation: 0 },
      border: { color: c.grid }
    };
  }

  let chart = null;
  let activeVista = 'volume-preco';

  function buildVolumePreco(d, c) {
    /* Deriva volume anual (t) e preço implícito a partir da série mensal. */
    const mesesPorAno = [12,12,12,12,12,12,12,12,12,12,4];
    const fobAnual    = d.composicao_sh6.series['080550'].data;
    const kgMensal    = d.serie_mensal.kg_liquido;
    const vol_t = [];
    const preco  = [];
    let idx = 0;
    mesesPorAno.forEach(function (m, i) {
      const kgSum = kgMensal.slice(idx, idx + m).reduce(function (a, b) { return a + b; }, 0);
      vol_t.push(+(kgSum / 1000).toFixed(2));
      preco.push(kgSum > 0 ? +(fobAnual[i] / kgSum).toFixed(4) : null);
      idx += m;
    });

    return {
      type: 'bar',
      data: {
        labels: LABELS,
        datasets: [
          {
            type:            'bar',
            label:           'Volume (toneladas)',
            data:            vol_t,
            backgroundColor: c.brandBg,
            borderColor:     c.brand,
            borderWidth:     1.5,
            yAxisID:         'y-vol',
            order:           2
          },
          {
            type:                 'line',
            label:                'Preço implícito (US$/kg)',
            data:                 preco,
            borderColor:          c.accent,
            backgroundColor:      'transparent',
            borderWidth:          2,
            pointRadius:          4,
            pointHoverRadius:     6,
            pointBackgroundColor: c.accent,
            tension:              0.2,
            yAxisID:              'y-preco',
            order:                1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: c.text, font: { size: 11 }, boxWidth: 20, padding: 14 }
          },
          tooltip: Object.assign(baseTooltip(c), {
            callbacks: {
              label: function (item) {
                if (item.datasetIndex === 0) {
                  return ' ' + item.parsed.y.toLocaleString('pt-BR') + ' t';
                }
                if (item.parsed.y === null) return null;
                return ' US$ ' + item.parsed.y.toFixed(4).replace('.', ',') + '/kg';
              }
            }
          })
        },
        scales: {
          x: baseXAxis(c),
          'y-vol': {
            position: 'left',
            grid:   { color: c.grid },
            min:    0,
            ticks:  {
              color: c.text,
              font:  { size: 11 },
              callback: function (v) {
                if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + ' kt';
                return v + ' t';
              }
            },
            border: { display: false }
          },
          'y-preco': {
            position: 'right',
            grid:   { display: false },
            min:    0,
            max:    1.4,
            ticks:  {
              color: c.accent,
              font:  { size: 11 },
              callback: function (v) { return 'US$ ' + v.toFixed(2).replace('.', ','); }
            },
            border: { display: false }
          }
        }
      }
    };
  }

  function buildPrecoSH4(c) {
    return {
      type: 'line',
      data: {
        labels: LABELS,
        datasets: [
          {
            label:                'Citrinos — 0805',
            data:                 PRECO_0805,
            borderColor:          c.brand,
            backgroundColor:      'transparent',
            borderWidth:          2,
            pointRadius:          4,
            pointHoverRadius:     6,
            pointBackgroundColor: c.brand,
            tension:              0.2,
            spanGaps:             false
          },
          {
            label:                'Frutas secas — 0813',
            data:                 PRECO_0813,
            borderColor:          c.accent,
            backgroundColor:      'transparent',
            borderWidth:          2,
            pointRadius:          4,
            pointHoverRadius:     6,
            pointBackgroundColor: c.accent,
            tension:              0.2,
            spanGaps:             false
          },
          {
            label:                'Manga / abacaxi — 0804',
            data:                 PRECO_0804,
            borderColor:          c.neutral,
            backgroundColor:      'transparent',
            borderWidth:          2,
            pointRadius:          4,
            pointHoverRadius:     6,
            pointBackgroundColor: c.neutral,
            tension:              0.2,
            spanGaps:             false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: c.text, font: { size: 11 }, boxWidth: 20, padding: 14 }
          },
          tooltip: Object.assign(baseTooltip(c), {
            callbacks: {
              label: function (item) {
                if (item.parsed.y === null) return null;
                return ' ' + item.dataset.label + ': US$ ' + item.parsed.y.toFixed(4).replace('.', ',') + '/kg';
              }
            }
          })
        },
        scales: {
          x: baseXAxis(c),
          y: {
            grid:  { color: c.grid },
            min:   0,
            ticks: {
              color: c.text,
              font:  { size: 11 },
              callback: function (v) { return 'US$ ' + v.toFixed(0); }
            },
            border: { display: false }
          }
        }
      }
    };
  }

  function render(vista, d) {
    if (chart) { chart.destroy(); chart = null; }
    const c = getColors();
    const cfg = vista === 'volume-preco' ? buildVolumePreco(d, c) : buildPrecoSH4(c);
    chart = new Chart(canvas, cfg);
  }

  fetch('dados/exportacoes-se.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      render(activeVista, d);

      wrapper.querySelectorAll('[data-vista]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const v = this.dataset.vista;
          if (v === activeVista) return;
          activeVista = v;
          wrapper.querySelectorAll('[data-vista]').forEach(function (b) {
            b.setAttribute('aria-pressed', 'false');
          });
          this.setAttribute('aria-pressed', 'true');
          render(v, d);
        });
      });
    })
    .catch(function () {
      console.warn('CobWeb: não foi possível carregar exportacoes-se.json');
    });
})();
