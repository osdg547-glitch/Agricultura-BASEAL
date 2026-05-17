/* ============================================================
   cobweb · exportações de hortifrúti · Sergipe
   ============================================================
   Fonte: Comex Stat / MDIC — SH2 07 + 08 combinados.
   Série mensal: jan/2016 – abr/2026 (124 pontos).
   Toggle: Valor US$ FOB ↔ Quilograma Líquido.
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('indice-geral');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const colors = {
    brand:     isDark ? '#5dcaa5' : '#1d9e75',
    brandFill: isDark ? 'rgba(93, 202, 165, 0.12)' : 'rgba(29, 158, 117, 0.08)',
    grid:      isDark ? 'rgba(240, 238, 229, 0.08)' : 'rgba(26, 26, 26, 0.08)',
    text:      isDark ? '#b4b2a9' : '#888780',
    tooltipBg: isDark ? 'rgba(240, 238, 229, 0.95)' : 'rgba(20, 20, 20, 0.92)',
    tooltipTx: isDark ? '#14140f' : '#ffffff'
  };

  /* Rótulos mensais: jan/2016 – abr/2026 */
  const labels = [
    'jan 2016','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2017','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2018','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2019','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2020','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2021','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2022','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2023','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2024','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2025','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez',
    'jan 2026','fev','mar','abr'
  ];

  /* Totais mensais SH2 07 + 08 combinados (meses ausentes = zero exportações) */
  const dataValor = [
    145945,31897,129138,276971,102467,96000,168747,160219,129260,574262,262635,794730,
    431709,332215,338066,408122,907707,0,226996,201216,0,0,3046,0,
    0,48427,138630,238932,117642,19112,0,0,0,0,0,21270,
    83751,14317,0,42681,89173,36457,19025,22947,44309,26462,63890,0,
    0,35352,16589,0,16392,19184,18725,26820,0,0,0,0,
    0,0,0,27640,0,0,0,0,0,0,2457,0,
    0,0,0,0,0,0,0,0,0,36590,0,98445,79666,
    45208,109717,155545,235664,174028,228903,185246,403556,190891,65826,66094,290807,
    319934,271633,465654,144305,153735,144913,118728,157737,120241,0,0,334892,
    195109,231522,156241,136128,109922,187384,116159,67139,0,0,0,0,
    0,25091,48766,98270
  ];

  const dataKg = [
    31516,1555,59252,37171,4265,4000,49736,69828,74120,265744,210024,361521,
    389600,132740,250035,63700,41040,0,190800,179200,0,0,25000,0,
    0,48960,144000,242740,113360,20680,0,0,0,0,0,24446,
    118800,23760,0,47520,95040,47520,23760,23760,47520,23760,47520,0,
    0,47520,23760,0,23760,23760,23760,23760,0,0,0,0,
    0,0,0,21168,0,0,0,0,0,0,1710,0,
    0,0,0,0,0,0,0,0,0,25920,0,51570,77760,
    77760,155520,103680,155520,153360,267840,166320,308880,190080,47520,71280,308880,
    356400,356400,498960,190080,213840,166320,95040,118800,118800,0,0,261360,
    190080,308880,190080,142560,118800,142560,95040,71280,0,0,0,0,
    0,23760,47520,95040
  ];

  const series = {
    valor: {
      label:   'Valor exportado (US$ FOB) · SH2 07+08',
      data:    dataValor,
      yMax:    1000000,
      fmtTick: function (v) {
        if (v >= 1000000) return 'US$ ' + (v / 1000000).toFixed(1).replace('.', ',') + ' M';
        if (v >= 1000)    return 'US$ ' + (v / 1000).toFixed(0) + 'K';
        return 'US$ ' + v;
      },
      fmtTip: function (v) {
        return 'US$ ' + v.toLocaleString('pt-BR') + ' FOB';
      }
    },
    kg: {
      label:   'Quilograma líquido exportado · SH2 07+08',
      data:    dataKg,
      yMax:    550000,
      fmtTick: function (v) {
        if (v >= 1000) return (v / 1000).toFixed(0) + 'K kg';
        return v + ' kg';
      },
      fmtTip: function (v) {
        return v.toLocaleString('pt-BR') + ' kg';
      }
    }
  };

  let active = 'valor';

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label:           series.valor.label,
        data:            series.valor.data,
        borderColor:     colors.brand,
        backgroundColor: colors.brandFill,
        borderWidth:     1.5,
        pointRadius:     0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: colors.brand,
        tension:         0.2,
        fill:            true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor:      colors.tooltipTx,
          bodyColor:       colors.tooltipTx,
          titleFont: { size: 11, weight: '500' },
          bodyFont:  { size: 12 },
          padding: 10,
          callbacks: {
            label: function (item) {
              return series[active].fmtTip(item.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: {
            color:       colors.text,
            font:        { size: 11 },
            maxRotation: 0,
            autoSkip:    false,
            callback:    function (val, index) {
              return labels[index].startsWith('jan') ? labels[index] : '';
            }
          },
          border: { color: colors.grid }
        },
        y: {
          grid:  { color: colors.grid },
          min:   0,
          max:   1000000,
          ticks: {
            color: colors.text,
            font:  { size: 11 },
            callback: function (v) {
              return series[active].fmtTick(v);
            }
          },
          border: { display: false }
        }
      }
    }
  });

  /* Toggle Valor ↔ Quilograma */
  document.querySelectorAll('[data-serie]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = this.dataset.serie;
      if (key === active) return;
      active = key;

      document.querySelectorAll('[data-serie]').forEach(function (b) {
        b.setAttribute('aria-pressed', 'false');
      });
      this.setAttribute('aria-pressed', 'true');

      const s = series[key];
      chart.data.datasets[0].data  = s.data;
      chart.data.datasets[0].label = s.label;
      chart.options.scales.y.max   = s.yMax;
      chart.update();
    });
  });
})();
