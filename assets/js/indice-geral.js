/* ============================================================
   cobweb · exportações de hortifrúti · Sergipe
   ============================================================
   Fonte de dados: dados/exportacoes-se.json
   Toggle: Valor US$ FOB · Quilograma Líquido · Preço Implícito
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('indice-geral');
  if (!canvas || typeof Chart === 'undefined') return;

  fetch('dados/exportacoes-se.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { renderChart(canvas, d); })
    .catch(function () {
      console.warn('CobWeb: não foi possível carregar exportacoes-se.json');
    });

  function renderChart(canvas, d) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const colors = {
      brand:     isDark ? '#5dcaa5' : '#1d9e75',
      brandFill: isDark ? 'rgba(93, 202, 165, 0.12)' : 'rgba(29, 158, 117, 0.08)',
      grid:      isDark ? 'rgba(240, 238, 229, 0.08)' : 'rgba(26, 26, 26, 0.08)',
      text:      isDark ? '#b4b2a9' : '#888780',
      tooltipBg: isDark ? 'rgba(240, 238, 229, 0.95)' : 'rgba(20, 20, 20, 0.92)',
      tooltipTx: isDark ? '#14140f' : '#ffffff'
    };

    const series = {
      valor: {
        label:   'Valor exportado (US$ FOB) · SH2 07+08',
        data:    d.valor_fob_usd,
        yMax:    3200000,
        fmtTick: function (v) {
          if (v >= 1000000) return 'US$ ' + (v / 1000000).toFixed(1).replace('.', ',') + ' M';
          if (v >= 1000)    return 'US$ ' + (v / 1000).toFixed(0) + 'K';
          return 'US$ ' + v;
        },
        fmtTip: function (v) { return 'US$ ' + v.toLocaleString('pt-BR') + ' FOB'; }
      },
      kg: {
        label:   'Quilograma líquido exportado · SH2 07+08',
        data:    d.kg_liquido,
        yMax:    2600000,
        fmtTick: function (v) {
          if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + ' M kg';
          if (v >= 1000)    return (v / 1000).toFixed(0) + 'K kg';
          return v + ' kg';
        },
        fmtTip: function (v) { return v.toLocaleString('pt-BR') + ' kg'; }
      },
      preco: {
        label:   'Preço implícito (US$/kg) · SH2 07+08',
        data:    d.preco_implicito_usd_kg,
        yMax:    2.8,
        fmtTick: function (v) { return 'US$ ' + v.toFixed(2).replace('.', ','); },
        fmtTip:  function (v) { return 'US$ ' + v.toFixed(4).replace('.', ',') + '/kg (implícito)'; }
      }
    };

    let active = 'valor';

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: d.labels,
        datasets: [{
          label:                series.valor.label,
          data:                 series.valor.data,
          borderColor:          colors.brand,
          backgroundColor:      colors.brandFill,
          borderWidth:          2,
          pointRadius:          4,
          pointHoverRadius:     6,
          pointBackgroundColor: colors.brand,
          tension:              0.2,
          fill:                 true
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
            titleFont: { size: 12, weight: '500' },
            bodyFont:  { size: 12 },
            padding: 10,
            callbacks: {
              label: function (item) { return series[active].fmtTip(item.parsed.y); }
            }
          }
        },
        scales: {
          x: {
            grid:   { display: false },
            ticks:  { color: colors.text, font: { size: 11 }, maxRotation: 0 },
            border: { color: colors.grid }
          },
          y: {
            grid:   { color: colors.grid },
            min:    0,
            max:    3200000,
            ticks:  {
              color: colors.text,
              font:  { size: 11 },
              callback: function (v) { return series[active].fmtTick(v); }
            },
            border: { display: false }
          }
        }
      }
    });

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
  }
})();
