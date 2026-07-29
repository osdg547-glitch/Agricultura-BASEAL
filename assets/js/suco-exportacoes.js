/* ============================================================
   cobweb · exportações de suco de laranja · Sergipe
   ============================================================
   Fonte de dados: dados/exportacoes-suco-laranja-se.json, informado em
   data-fonte no canvas.
   Alterna entre valor US$ FOB, quilograma líquido e preço implícito.
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('suco-exportacoes');
  if (!canvas || typeof Chart === 'undefined') return;

  const wrapper = document.getElementById('suco-exportacoes-wrapper');

  fetch(canvas.dataset.fonte)
    .then(function (r) { return r.json(); })
    .then(function (d) { renderChart(canvas, d); })
    .catch(function () {
      console.warn('CobWeb: não foi possível carregar ' + canvas.dataset.fonte);
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

    const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const series = {
      valor: {
        label:   'Valor exportado de suco de laranja (US$ FOB)',
        data:    d.valor_fob_usd,
        yMax:    160000000,
        fmtTick: function (v) { return 'US$ ' + (v / 1000000) + ' mi'; },
        fmtTip:  function (v) { return 'US$ ' + nf.format(v) + ' FOB'; }
      },
      kg: {
        label:   'Quilograma líquido exportado de suco de laranja',
        data:    d.kg_liquido,
        yMax:    60000000,
        fmtTick: function (v) { return (v / 1000000) + ' mil t'; },
        fmtTip:  function (v) { return nf.format(v) + ' kg'; }
      },
      preco: {
        label:   'Preço implícito do suco de laranja (US$/kg)',
        data:    d.preco_implicito_usd_kg,
        yMax:    6,
        fmtTick: function (v) { return 'US$ ' + nf2.format(v); },
        fmtTip:  function (v) { return 'US$ ' + nf2.format(v) + '/kg'; }
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
          pointRadius:          3,
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
            ticks:  { color: colors.text, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 12 },
            border: { color: colors.grid }
          },
          y: {
            grid:   { color: colors.grid },
            min:    0,
            max:    series.valor.yMax,
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

    /* Escopo no wrapper: a página tem outro seletor com data-serie. */
    wrapper.querySelectorAll('[data-serie]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const chave = this.dataset.serie;
        if (chave === active) return;
        active = chave;

        wrapper.querySelectorAll('[data-serie]').forEach(function (b) {
          b.setAttribute('aria-pressed', 'false');
        });
        this.setAttribute('aria-pressed', 'true');

        const s = series[chave];
        chart.data.datasets[0].data  = s.data;
        chart.data.datasets[0].label = s.label;
        chart.options.scales.y.max   = s.yMax;
        chart.update();
      });
    });
  }
})();
