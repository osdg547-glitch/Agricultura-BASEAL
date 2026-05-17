/* ============================================================
   cobweb · exportações de hortifrúti · Sergipe
   ============================================================
   Dados reais: Comex Stat / MDIC.
   Totais anuais em US$ FOB por capítulo SH2 (07 e 08).
   Período: 2016–2026 (2026 parcial, jan–abr).
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('indice-geral');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const colors = {
    brand:     isDark ? '#5dcaa5' : '#1d9e75',
    brandFill: isDark ? 'rgba(93, 202, 165, 0.25)' : 'rgba(29, 158, 117, 0.18)',
    grid:      isDark ? 'rgba(240, 238, 229, 0.08)' : 'rgba(26, 26, 26, 0.08)',
    text:      isDark ? '#b4b2a9' : '#888780',
    tooltipBg: isDark ? 'rgba(240, 238, 229, 0.95)' : 'rgba(20, 20, 20, 0.92)',
    tooltipTx: isDark ? '#14140f' : '#ffffff'
  };

  const labels = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026*'];

  /* Totais anuais calculados a partir de Comex Stat (SH2 = Código de 2 dígitos) */
  const series = {
    sh08: {
      label: 'SH2 08 · Frutas e cascas de cítricos (US$ FOB)',
      data:  [2872271, 2849077, 584013, 443012, 133062, 28763, 214701, 2151485, 2231772, 1199604, 172127],
      yMax:  3200000
    },
    sh07: {
      label: 'SH2 07 · Hortícolas, raízes e tubérculos (US$ FOB)',
      data:  [0, 0, 0, 0, 0, 1334, 0, 0, 0, 0, 0],
      yMax:  2000
    }
  };

  let active = 'sh08';

  function fmtUSD(v) {
    if (v >= 1000000) return 'US$ ' + (v / 1000000).toFixed(2).replace('.', ',') + ' M';
    if (v >= 1000)    return 'US$ ' + (v / 1000).toFixed(1).replace('.', ',') + ' K';
    return 'US$ ' + v.toLocaleString('pt-BR');
  }

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: series.sh08.label,
        data:  series.sh08.data,
        backgroundColor: colors.brandFill,
        borderColor:     colors.brand,
        borderWidth:     1.5,
        borderRadius:    3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor:      colors.tooltipTx,
          bodyColor:       colors.tooltipTx,
          titleFont: { size: 12, weight: '500' },
          bodyFont:  { size: 12 },
          padding: 10,
          callbacks: {
            label: (item) => fmtUSD(item.parsed.y)
          }
        }
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: colors.text, font: { size: 11 }, maxRotation: 0 },
          border:{ color: colors.grid }
        },
        y: {
          grid:  { color: colors.grid },
          ticks: {
            color: colors.text,
            font:  { size: 11 },
            callback: (v) => fmtUSD(v)
          },
          border:{ display: false },
          min: 0,
          max: 3200000
        }
      }
    }
  });

  /* Toggle entre SH2 08 e SH2 07 */
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
