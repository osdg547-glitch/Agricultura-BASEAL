/* ============================================================
   cobweb · composição das exportações por SH4
   ============================================================
   Gráfico de barras empilhadas: valor US$ FOB por ano,
   decomposto pelas principais classificações SH4.
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('composicao-sh4');
  if (!canvas || typeof Chart === 'undefined') return;

  fetch('dados/exportacoes-se.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { renderChart(canvas, d); })
    .catch(function () {
      console.warn('CobWeb: não foi possível carregar exportacoes-se.json para composicao-sh4');
    });

  function renderChart(canvas, d) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const palette = isDark
      ? { c0805: '#5dcaa5', c0813: '#c47c2e', c0804: '#5d8fa8', c0811: '#9a7050', outros: '#55544f' }
      : { c0805: '#1d9e75', c0813: '#a86820', c0804: '#3a6d88', c0811: '#7a5230', outros: '#b8b7ae' };

    const colors = {
      grid:      isDark ? 'rgba(240, 238, 229, 0.08)' : 'rgba(26, 26, 26, 0.08)',
      text:      isDark ? '#b4b2a9' : '#888780',
      tooltipBg: isDark ? 'rgba(28, 28, 23, 0.97)' : 'rgba(20, 20, 20, 0.93)',
      tooltipTx: isDark ? '#f0eee5' : '#ffffff'
    };

    const comp = d.composicao_sh4.series;

    const datasets = [
      {
        label: comp['0805'].label,
        data: comp['0805'].data,
        backgroundColor: palette.c0805
      },
      {
        label: comp['0813'].label,
        data: comp['0813'].data,
        backgroundColor: palette.c0813
      },
      {
        label: comp['0804'].label,
        data: comp['0804'].data,
        backgroundColor: palette.c0804
      },
      {
        label: comp['0811'].label,
        data: comp['0811'].data,
        backgroundColor: palette.c0811
      },
      {
        label: comp['outros'].label,
        data: comp['outros'].data,
        backgroundColor: palette.outros
      }
    ];

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: d.labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'start',
            labels: {
              color: colors.text,
              font: { size: 11, family: 'Inter, -apple-system, sans-serif' },
              boxWidth: 12,
              boxHeight: 12,
              padding: 20,
              usePointStyle: false,
              filter: function (item, data) {
                /* oculta séries com todos os valores zerados */
                return data.datasets[item.datasetIndex].data.some(function (v) { return v > 0; });
              }
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipTx,
            bodyColor: colors.tooltipTx,
            titleFont: { size: 12, weight: '500' },
            bodyFont: { size: 12 },
            padding: 12,
            callbacks: {
              label: function (item) {
                const v = item.parsed.y;
                if (v === 0) return null;
                const fmt = v >= 1000
                  ? 'US$ ' + (v / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' mil'
                  : 'US$ ' + v.toLocaleString('pt-BR');
                return ' ' + item.dataset.label.split(' — ')[0] + ': ' + fmt;
              },
              footer: function (items) {
                const total = items.reduce(function (s, i) { return s + i.parsed.y; }, 0);
                return 'Total: US$ ' + (total / 1000000).toFixed(2).replace('.', ',') + ' M';
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: colors.text, font: { size: 11 }, maxRotation: 0 },
            border: { color: colors.grid }
          },
          y: {
            stacked: true,
            grid: { color: colors.grid },
            min: 0,
            ticks: {
              color: colors.text,
              font: { size: 11 },
              callback: function (v) {
                if (v >= 1000000) return 'US$ ' + (v / 1000000).toFixed(1).replace('.', ',') + ' M';
                if (v >= 1000) return 'US$ ' + (v / 1000).toFixed(0) + ' K';
                return v === 0 ? '0' : 'US$ ' + v;
              }
            },
            border: { display: false }
          }
        }
      }
    });
  }
})();
