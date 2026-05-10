/* ============================================================
   cobweb · gráfico do índice geral
   ============================================================
   Renderiza a série temporal do índice nas três CEASAs.
   Espera um <canvas id="indice-geral"> e Chart.js carregado.

   Quando os dados reais estiverem disponíveis (PROHORT/CONAB),
   substitua o array gerado em buildSeries() pela leitura de
   /dados/indice-geral.json (ou similar).
   ============================================================ */

(function () {
  const canvas = document.getElementById('indice-geral');
  if (!canvas || typeof Chart === 'undefined') return;

  // Detecta dark mode para ajustar cores do gráfico
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const colors = {
    brand: isDark ? '#5dcaa5' : '#1d9e75',
    brandFill: isDark ? 'rgba(93, 202, 165, 0.1)' : 'rgba(29, 158, 117, 0.08)',
    neutral: '#888780',
    grid: isDark ? 'rgba(240, 238, 229, 0.08)' : 'rgba(26, 26, 26, 0.08)',
    text: isDark ? '#b4b2a9' : '#888780'
  };

  // Série de exemplo. Substituir por dados reais.
  function buildSeries() {
    const labels = [];
    const aracaju = [];
    const recife = [];
    const saopaulo = [];
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const startYear = 2020;

    for (let y = 0; y < 6; y++) {
      for (let m = 0; m < 12; m++) {
        if (y === 5 && m > 4) break;
        labels.push(y === 0 || m === 0 ? `${months[m]} ${startYear + y}` : months[m]);
        const t = y * 12 + m;
        const trend = 100 + (t - 30) * 0.15;
        const seasonal = Math.sin(t * 2 * Math.PI / 12) * 4;
        const cycle = Math.sin(t * 2 * Math.PI / 18) * 6;
        aracaju.push(+(trend + seasonal + cycle + (Math.random() - 0.5) * 1.2).toFixed(1));
        recife.push(+(trend * 1.02 + seasonal * 0.7 + cycle * 0.6 + (Math.random() - 0.5) * 1.0).toFixed(1));
        saopaulo.push(+(trend * 1.04 + seasonal * 0.5 + cycle * 0.4 + (Math.random() - 0.5) * 0.8).toFixed(1));
      }
    }
    return { labels, aracaju, recife, saopaulo };
  }

  const { labels, aracaju, recife, saopaulo } = buildSeries();

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Aracaju',
          data: aracaju,
          borderColor: colors.brand,
          backgroundColor: colors.brandFill,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: true
        },
        {
          label: 'Recife',
          data: recife,
          borderColor: colors.neutral,
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: false
        },
        {
          label: 'São Paulo',
          data: saopaulo,
          borderColor: colors.neutral,
          borderWidth: 1.5,
          borderDash: [2, 3],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
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
          backgroundColor: isDark ? 'rgba(240, 238, 229, 0.95)' : 'rgba(20, 20, 20, 0.92)',
          titleColor: isDark ? '#14140f' : '#ffffff',
          bodyColor: isDark ? '#14140f' : '#ffffff',
          titleFont: { size: 12, weight: '500' },
          bodyFont: { size: 12 },
          padding: 10,
          callbacks: {
            label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(1)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: colors.text,
            font: { size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          },
          border: { color: colors.grid }
        },
        y: {
          grid: { color: colors.grid, drawBorder: false },
          ticks: {
            color: colors.text,
            font: { size: 11 },
            stepSize: 5
          },
          border: { display: false },
          min: 85,
          max: 120
        }
      }
    }
  });
})();
