/* ============================================================
   cobweb · gráfico tri-canal de preços por produto
   ============================================================
   Renderiza um canvas com 3 séries (atacado CEASA, varejo Mercado
   Central, varejo Augusto Franco) a partir do JSON consolidado
   EMDAGRO Q1/2026. Reutilizável: o canvas precisa ter atributos
   data-produto="<slug>" e data-json="<caminho/precos.json>".

   Slugs esperados: tomate, cebola_roxa, batata_lisa, manga_tommy,
   inhame_da_costa, cenoura.
   ============================================================ */

(function () {
  const canvas = document.querySelector('canvas[data-produto]');
  if (!canvas || typeof Chart === 'undefined') return;

  const slug = canvas.dataset.produto;
  const jsonPath = canvas.dataset.json || '../../dados/precos-emdagro-q1-2026.json';

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const colors = {
    atacado:    isDark ? '#5dcaa5' : '#1d9e75',
    varejoMc:   isDark ? '#d4a96a' : '#a0762a',
    varejoAf:   isDark ? '#7aa6d4' : '#3a6ea5',
    grid:       isDark ? 'rgba(240, 238, 229, 0.08)' : 'rgba(26, 26, 26, 0.08)',
    text:       isDark ? '#b4b2a9' : '#888780',
    tooltip_bg: isDark ? 'rgba(240, 238, 229, 0.95)' : 'rgba(20, 20, 20, 0.92)',
    tooltip_tx: isDark ? '#14140f' : '#ffffff'
  };

  const fmtData = (iso) => {
    /* '2026-02-19' → '19/fev' */
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const [, m, d] = iso.split('-');
    return `${parseInt(d, 10)}/${meses[parseInt(m, 10) - 1]}`;
  };

  fetch(jsonPath)
    .then((r) => r.json())
    .then((dados) => render(dados))
    .catch((err) => {
      console.error('Falha ao carregar JSON de preços:', err);
    });

  function render(dados) {
    const produto = dados.produtos[slug];
    if (!produto) {
      console.error(`Produto não encontrado no JSON: ${slug}`);
      return;
    }

    const canais = dados.meta.canais;

    /* União ordenada de todas as datas observadas nos 3 canais. */
    const todasDatas = new Set();
    ['atacado_ceasa', 'varejo_mercado_central', 'varejo_augusto_franco'].forEach((k) => {
      canais[k].datas.forEach((d) => todasDatas.add(d));
    });
    const labels = Array.from(todasDatas).sort();

    /* Alinha cada canal à lista unificada de datas (null onde não há leitura). */
    const alinhar = (canal) => {
      const bloco = produto[canal];
      if (!bloco) return null;
      const datasCanal = canais[canal].datas;
      const mapa = new Map();
      datasCanal.forEach((d, i) => mapa.set(d, bloco.precos_rs_kg[i]));
      return labels.map((d) => (mapa.has(d) ? mapa.get(d) : null));
    };

    const dsAtacado = alinhar('atacado_ceasa');
    const dsVarejoMc = alinhar('varejo_mercado_central');
    const dsVarejoAf = alinhar('varejo_augusto_franco');

    new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels.map(fmtData),
        datasets: [
          {
            label: 'Atacado CEASA-SE',
            data: dsAtacado,
            borderColor: colors.atacado,
            backgroundColor: 'transparent',
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            spanGaps: true
          },
          {
            label: 'Varejo Mercado Central',
            data: dsVarejoMc,
            borderColor: colors.varejoMc,
            backgroundColor: 'transparent',
            borderDash: [4, 4],
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            spanGaps: true
          },
          {
            label: 'Varejo Augusto Franco',
            data: dsVarejoAf,
            borderColor: colors.varejoAf,
            backgroundColor: 'transparent',
            borderDash: [2, 3],
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            spanGaps: true
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
            padding: 10,
            cornerRadius: 4,
            displayColors: true,
            callbacks: {
              label: (item) => {
                if (item.parsed.y == null) return null;
                return ` ${item.dataset.label}: R$ ${item.parsed.y.toFixed(2)}/kg`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: 'Inter, sans-serif', size: 11 },
              maxRotation: 0,
              autoSkipPadding: 16
            }
          },
          y: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              font: { family: 'Inter, sans-serif', size: 11 },
              callback: (v) => `R$ ${v.toFixed(2)}`
            }
          }
        }
      }
    });
  }
})();
