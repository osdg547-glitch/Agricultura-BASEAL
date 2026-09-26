/* ============================================================
   cobweb · Platô de Neópolis · decomposição da produção
   ============================================================
   Gráfico D: para cada intervalo entre médias trienais, a variação
   da produção repartida em contribuição da área colhida e do
   rendimento, em pontos percentuais. Barras horizontais empilhadas,
   negativos à esquerda do zero, e um marcador com a variação total
   (que é a soma exata das duas parcelas).

   Botões alternam o recorte: Platô, Sergipe, Brasil, São Paulo.
   O eixo horizontal é fixo entre os recortes, calculado sobre todos
   eles, para que a mesma distância signifique a mesma coisa ao
   trocar de botão.

   Fonte: dados/limao-plato.json, decomposicao.
   ============================================================ */

(function () {
  'use strict';

  const L = window.CobWebLimao;
  const canvas = document.getElementById('limao-decomposicao');
  const wrapper = document.getElementById('limao-decomposicao-wrapper');
  if (!L || !canvas || !wrapper || typeof Chart === 'undefined') return;

  L.carregar(canvas.dataset.fonte)
    .then(desenhar)
    .catch(function (e) { console.warn('CobWeb: ' + e.message); });

  function sinal(v) {
    return (v > 0 ? '+' : v < 0 ? '−' : '') + L.nf1.format(Math.abs(v));
  }

  function desenhar(d) {
    const c = L.cores();
    const dec = d.decomposicao;
    let recorte = 'plato';

    /* Limite simétrico do eixo, arredondado para a dezena acima. */
    let maior = 0;
    Object.keys(dec).forEach(function (k) {
      dec[k].forEach(function (r) {
        maior = Math.max(maior, Math.abs(r.contrib_area_pp), Math.abs(r.contrib_rendimento_pp),
          Math.abs(r.var_producao_pct), Math.abs(r.contrib_area_pp + r.contrib_rendimento_pp));
        /* Barras de sinal igual se somam no empilhamento. */
        maior = Math.max(maior, Math.max(r.contrib_area_pp, 0) + Math.max(r.contrib_rendimento_pp, 0),
          -(Math.min(r.contrib_area_pp, 0) + Math.min(r.contrib_rendimento_pp, 0)));
      });
    });
    /* Folga de 10% para o marcador do extremo não encostar na borda. */
    const limite = Math.ceil(maior * 1.1 / 10) * 10;

    function rotulos(k) {
      return dec[k].map(function (r) { return r.de + ' → ' + r.para; });
    }

    function conjuntos(k) {
      const linhas = dec[k];
      return [
        {
          type:            'bar',
          label:           'Área colhida',
          data:            linhas.map(function (r) { return r.contrib_area_pp; }),
          backgroundColor: c.marca,
          stack:           'contrib',
          order:           1
        },
        {
          type:            'bar',
          label:           'Rendimento',
          data:            linhas.map(function (r) { return r.contrib_rendimento_pp; }),
          backgroundColor: c.neutroFundo,
          borderColor:     c.neutro,
          borderWidth:     1,
          stack:           'contrib',
          order:           1
        },
        {
          /* Marcador da variação total: um ponto em cada linha. */
          type:            'scatter',
          label:           'Variação total da produção',
          data:            linhas.map(function (r, i) { return { x: r.var_producao_pct, y: i }; }),
          yAxisID:         'yTotal',
          pointStyle:      'rectRot',
          pointRadius:     7,
          pointHoverRadius: 8,
          backgroundColor: c.texto,
          borderColor:     c.fundo,
          borderWidth:     1.5,
          order:           0
        }
      ];
    }

    const chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: rotulos(recorte), datasets: conjuntos(recorte) },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', axis: 'y', intersect: false },
        plugins: {
          legend: L.legenda(c),
          tooltip: Object.assign(L.tooltip(c), {
            filter: function (item) { return item.dataset.type !== 'scatter'; },
            callbacks: {
              title: function (itens) { return itens[0].label; },
              label: function (item) {
                return item.dataset.label + ': ' + sinal(item.parsed.x) + ' p.p.';
              },
              footer: function (itens) {
                const r = dec[recorte][itens[0].dataIndex];
                return 'Variação da produção: ' + sinal(r.var_producao_pct) + '%';
              }
            }
          })
        },
        scales: {
          x: {
            stacked: true,
            min: -limite,
            max: limite,
            grid: {
              /* A linha do zero mais marcada, para separar ganho de perda. */
              color: function (ctx) { return ctx.tick && ctx.tick.value === 0 ? c.textoFraco : c.grade; }
            },
            ticks: {
              color: c.textoFraco,
              font:  { size: 11 },
              callback: function (v) { return sinal(v).replace(',0', '') + ' p.p.'; }
            },
            border: { display: false }
          },
          y: {
            stacked: true,
            grid:   { display: false },
            ticks:  { color: c.textoFraco, font: { size: 11 } },
            border: { color: c.grade }
          },
          /* Eixo invisível e linear para posicionar o marcador sobre cada
             categoria: o índice i cai no centro da i-ésima barra. */
          yTotal: {
            type:    'linear',
            display: false,
            reverse: true,
            min:     -0.5,
            max:     dec[recorte].length - 0.5
          }
        }
      }
    });

    L.alternar(wrapper, 'recorte', function (k) {
      recorte = k;
      chart.data.labels = rotulos(k);
      chart.data.datasets = conjuntos(k);
      chart.options.scales.yTotal.max = dec[k].length - 0.5;
      chart.update();
    });
  }
})();
