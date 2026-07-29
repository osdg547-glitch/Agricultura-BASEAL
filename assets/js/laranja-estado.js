/* ============================================================
   cobweb · laranja em Sergipe · série agregada do estado
   ============================================================
   Fonte de dados: o mesmo arquivo municipal que alimenta o mapa,
   informado em data-fonte no canvas. A agregação é feita aqui, no
   navegador, para que gráfico e mapa nunca divirjam.

   Área e quantidade são somas simples dos municípios com dado.
   Rendimento não é média dos rendimentos municipais, e sim razão
   entre os dois totais: soma da quantidade em toneladas, vezes mil,
   dividida pela soma da área em hectares. A média simples daria peso
   igual a um município de 20 hectares e a outro de 4.000.
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('laranja-estado');
  if (!canvas || typeof Chart === 'undefined') return;

  const wrapper = document.getElementById('laranja-estado-wrapper');
  const fonte = canvas.dataset.fonte;

  fetch(fonte)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      creditarExtracao(d.extracao);
      renderChart(canvas, agregar(d));
    })
    .catch(function () {
      console.warn('CobWeb: não foi possível carregar ' + fonte);
    });

  /* Completa a linha de crédito com a data que está no próprio arquivo, para
     que atualizar o dado atualize o crédito. Se o fetch falhar, a linha fica
     só com a fonte, sem sobra de pontuação. */
  function creditarExtracao(iso) {
    const alvo = wrapper && wrapper.querySelector('[data-extracao]');
    if (!alvo || !iso) return;
    alvo.textContent = ', extração em ' + iso.split('-').reverse().join('/');
  }

  /* Soma o estado ano a ano, ignorando município sem dado no ano. */
  function agregar(d) {
    const anos = d.anos;
    const area = [], qtd = [], rend = [];

    anos.forEach(function (ano, i) {
      let somaArea = 0, somaQtd = 0;
      Object.keys(d.municipios).forEach(function (cod) {
        const m = d.municipios[cod];
        if (m.area && m.area[i]) somaArea += m.area[i];
        if (m.qtd && m.qtd[i]) somaQtd += m.qtd[i];
      });
      area.push(somaArea);
      qtd.push(somaQtd);
      rend.push(somaArea > 0 ? somaQtd * 1000 / somaArea : null);
    });

    return { anos: anos, area: area, qtd: qtd, rend: rend };
  }

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

    const series = {
      area: {
        label:   'Área colhida de laranja em Sergipe (ha)',
        data:    d.area,
        yMax:    60000,
        fmtTick: function (v) { return v >= 1000 ? (v / 1000) + ' mil' : v; },
        fmtTip:  function (v) { return nf.format(v) + ' ha colhidos'; }
      },
      qtd: {
        label:   'Quantidade produzida de laranja em Sergipe (t)',
        data:    d.qtd,
        yMax:    900000,
        fmtTick: function (v) { return v >= 1000 ? (v / 1000) + ' mil' : v; },
        fmtTip:  function (v) { return nf.format(v) + ' t produzidas'; }
      },
      rend: {
        label:   'Rendimento médio da laranja em Sergipe (kg/ha)',
        data:    d.rend,
        yMax:    16000,
        fmtTick: function (v) { return v >= 1000 ? (v / 1000) + ' mil' : v; },
        fmtTip:  function (v) { return nf.format(v) + ' kg/ha'; }
      }
    };

    let active = 'area';

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: d.anos,
        datasets: [{
          label:                series.area.label,
          data:                 series.area.data,
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
            max:    series.area.yMax,
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

    /* Escopo no wrapper: a home tem outros botões com data-serie. */
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
