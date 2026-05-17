/* ============================================================
   cobweb · gráfico do tomate
   ============================================================
   Dados reais: EMDAGRO atacado e Mercado Central de Aracaju.
   Janela: jan–mar/2026. Valores em R$/kg, médias mensais.
   ============================================================ */

(function () {
  const canvas = document.getElementById('grafico-tomate');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const colors = {
    brand:      isDark ? '#5dcaa5' : '#1d9e75',
    brandFill:  isDark ? 'rgba(93, 202, 165, 0.12)' : 'rgba(29, 158, 117, 0.08)',
    accent:     isDark ? '#d4a96a' : '#a0762a',
    grid:       isDark ? 'rgba(240, 238, 229, 0.08)' : 'rgba(26, 26, 26, 0.08)',
    text:       isDark ? '#b4b2a9' : '#888780',
    tooltip_bg: isDark ? 'rgba(240, 238, 229, 0.95)' : 'rgba(20, 20, 20, 0.92)',
    tooltip_tx: isDark ? '#14140f' : '#ffffff'
  };

  const labels = ['jan 2026', 'fev', 'mar'];

  /* EMDAGRO atacado CEASA-SE — caixa 25 kg convertida para R$/kg */
  const emdagro = [2.80, 3.49, 5.49];

  /* Mercado Central de Aracaju — canal híbrido atacado-varejo popular */
  const mercado = [3.00, 3.00, 4.56];

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'EMDAGRO atacado',
          data: emdagro,
          borderColor: colors.brand,
          backgroundColor: colors.brandFill,
          borderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: colors.brand,
          tension: 0.2,
          fill: true
        },
        {
          label: 'Mercado Central (híbrido)',
          data: mercado,
          borderColor: colors.accent,
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: colors.accent,
          tension: 0.2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltip_bg,
          titleColor: colors.tooltip_tx,
          bodyColor: colors.tooltip_tx,
          titleFont: { size: 12, weight: '500' },
          bodyFont: { size: 12 },
          padding: 10,
          callbacks: {
            label: (item) => `${item.dataset.label}: R$ ${item.parsed.y.toFixed(2)}/kg`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.text, font: { size: 11 }, maxRotation: 0 },
          border: { color: colors.grid }
        },
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            font: { size: 11 },
            callback: (v) => `R$ ${v.toFixed(2)}`
          },
          border: { display: false },
          min: 2,
          max: 7,
          title: { display: true, text: 'R$/kg', color: colors.text, font: { size: 11 } }
        }
      }
    }
  });
})();
