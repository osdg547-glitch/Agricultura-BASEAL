/* ============================================================
   cobweb · vitrine das séries de preço
   ============================================================
   Um painel só, que troca de produto a cada cinco segundos:
   nome, preço no fim do trimestre, variação desde janeiro e o
   desenho da série inteira no atacado do CEASA-SE.

   A ordem e os endereços saem das próprias fichas listadas em
   [data-vitrine-chips] — o HTML continua sendo a fonte da lista,
   e sem JavaScript o leitor ainda vê a primeira série e todos os
   onze links.

   Cores: nenhuma cor aqui. O painel recebe a classe de tendência
   (painel--alta, --baixa, --estavel) e o cobweb.css resolve o
   matiz nos dois temas.
   ============================================================ */

(function () {
  'use strict';

  const INTERVALO = 5000;   /* tempo de cada série no painel */
  const FADE = 200;         /* precisa casar com a transição do CSS */

  const vitrine = document.querySelector('[data-vitrine]');
  if (!vitrine) return;

  const painel = vitrine.querySelector('[data-painel]');
  const chips = Array.prototype.slice.call(
    vitrine.querySelectorAll('[data-vitrine-chips] [data-produto]')
  );
  if (!painel || !chips.length) return;

  const el = {
    nome:     painel.querySelector('[data-painel-nome]'),
    delta:    painel.querySelector('[data-painel-delta]'),
    preco:    painel.querySelector('[data-painel-preco]'),
    grafico:  painel.querySelector('[data-painel-grafico]'),
    link:     painel.querySelector('[data-painel-link]'),
    linkNome: painel.querySelector('[data-painel-link-nome]'),
    pausa:    painel.querySelector('[data-painel-pausa]'),
    resumo:   painel.querySelector('[data-painel-resumo]')
  };

  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const moeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2
  });

  let series = [];      /* {chave, rotulo, href, precos} na ordem dos chips */
  let atual = 0;
  let timer = null;
  let pausadoPeloLeitor = menosMovimento;  /* sem movimento: começa parado */
  let sobrevoando = false;

  fetch(vitrine.dataset.vitrine)
    .then(function (r) { return r.json(); })
    .then(iniciar)
    .catch(function (e) {
      console.warn('CobWeb: vitrine não carregada de ' + vitrine.dataset.vitrine, e);
    });

  function iniciar(dados) {
    const produtos = dados.produtos || {};

    series = chips.map(function (chip) {
      const bloco = produtos[chip.dataset.produto];
      const canal = bloco && bloco.atacado_ceasa;
      const precos = canal
        ? canal.precos_rs_kg.filter(function (v) { return v !== null; })
        : [];
      return {
        chave: chip.dataset.produto,
        rotulo: chip.textContent.trim(),
        href: chip.getAttribute('href'),
        precos: precos,
        /* Base da variação: a média de janeiro, como nas fichas de produto
           ("vs. jan/2026"). Sem médias mensais, cai na primeira coleta. */
        base: canal ? mediaDoPrimeiroMes(canal, precos) : 0,
        chip: chip
      };
    }).filter(function (s) { return s.precos.length > 1; });

    if (!series.length) return;

    ligarControles();
    mostrar(0, true);
    if (!pausadoPeloLeitor) agendar();
    sincronizarBotao();
  }

  /* ---------- controles de leitura ---------- */

  function ligarControles() {
    /* Sobrevoar ou tabular pela vitrine congela a troca: ninguém perde
       de vista a série que estava lendo. */
    vitrine.addEventListener('mouseenter', function () { sobrevoando = true; parar(); });
    vitrine.addEventListener('mouseleave', function () { sobrevoando = false; retomarSePuder(); });
    vitrine.addEventListener('focusin',  function () { sobrevoando = true; parar(); });
    vitrine.addEventListener('focusout', function (ev) {
      if (!vitrine.contains(ev.relatedTarget)) { sobrevoando = false; retomarSePuder(); }
    });

    /* Cada ficha da lista chama a própria série para o painel; o clique
       continua levando à página do produto. */
    series.forEach(function (serie, i) {
      serie.chip.addEventListener('mouseenter', function () { mostrar(i); });
      serie.chip.addEventListener('focus', function () { mostrar(i); });
    });

    if (el.pausa) {
      el.pausa.addEventListener('click', function () {
        pausadoPeloLeitor = !pausadoPeloLeitor;
        if (pausadoPeloLeitor) parar(); else retomarSePuder();
        sincronizarBotao();
      });
    }

    /* Aba em segundo plano não precisa girar. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) parar(); else retomarSePuder();
    });
  }

  function sincronizarBotao() {
    if (!el.pausa) return;
    el.pausa.textContent = pausadoPeloLeitor ? 'retomar' : 'pausar';
    el.pausa.setAttribute('aria-pressed', pausadoPeloLeitor ? 'true' : 'false');
    el.pausa.setAttribute(
      'aria-label',
      pausadoPeloLeitor ? 'Retomar a troca automática de série' : 'Pausar a troca automática de série'
    );
  }

  function agendar() {
    parar();
    timer = window.setTimeout(function () {
      mostrar((atual + 1) % series.length);
      agendar();
    }, INTERVALO);
    painel.classList.remove('painel--parado');
  }

  function parar() {
    if (timer) { window.clearTimeout(timer); timer = null; }
    painel.classList.add('painel--parado');
  }

  function retomarSePuder() {
    if (pausadoPeloLeitor || sobrevoando || document.hidden) return;
    agendar();
  }

  /* ---------- troca de série ---------- */

  function mostrar(i, imediato) {
    if (i === atual && !imediato) return;
    atual = i;

    if (imediato || menosMovimento) {
      pintar(series[i]);
      return;
    }

    painel.classList.add('painel--trocando');
    window.setTimeout(function () {
      pintar(series[i]);
      painel.classList.remove('painel--trocando');
    }, FADE);
  }

  function mediaDoPrimeiroMes(canal, precos) {
    const medias = canal.medias_mensais_rs_kg;
    const meses = medias ? Object.keys(medias).sort() : [];
    return meses.length ? medias[meses[0]] : precos[0];
  }

  function pintar(serie) {
    const precos = serie.precos;
    const base = serie.base;
    const ultima = precos[precos.length - 1];
    const variacao = base === 0 ? 0 : Math.round((ultima / base - 1) * 100);

    const tendencia = variacao >= 1 ? 'alta' : variacao <= -1 ? 'baixa' : 'estavel';

    painel.classList.remove('painel--alta', 'painel--baixa', 'painel--estavel');
    painel.classList.add('painel--' + tendencia);

    el.nome.textContent = serie.rotulo;

    el.delta.textContent = formatarVariacao(variacao);
    el.delta.className = 'painel__delta '
      + (tendencia === 'alta' ? 'delta-up' : tendencia === 'baixa' ? 'delta-down' : 'delta-flat');

    el.preco.innerHTML = moeda.format(ultima)
      + '<span class="painel__unid">/kg</span>';

    if (el.link) el.link.setAttribute('href', serie.href);
    if (el.linkNome) el.linkNome.textContent = serie.rotulo;

    if (el.resumo) {
      el.resumo.textContent = 'Mínimo de ' + moeda.format(Math.min.apply(null, precos))
        + ' e máximo de ' + moeda.format(Math.max.apply(null, precos))
        + ' por quilo nas ' + precos.length + ' coletas do trimestre.';
    }

    series.forEach(function (s) {
      if (s === serie) s.chip.setAttribute('aria-current', 'true');
      else s.chip.removeAttribute('aria-current');
    });

    desenhar(serie, variacao);
  }

  function formatarVariacao(v) {
    if (v > 0) return '+' + v + '%';
    if (v < 0) return '−' + Math.abs(v) + '%';  /* sinal de menos, não hífen */
    return '0%';
  }

  /* ---------- desenho ---------- */

  function desenhar(serie, variacao) {
    const svg = el.grafico;
    if (!svg) return;

    const caixa = (svg.getAttribute('viewBox') || '0 0 480 180').split(/\s+/).map(Number);
    const geo = geometria(serie.precos, serie.base, caixa[2], caixa[3]);

    svg.setAttribute('aria-label', rotuloAcessivel(serie, variacao));
    svg.innerHTML =
      '<path class="spark__area" d="' + geo.area + '"/>'
      + '<line class="spark__ref" x1="' + geo.pad.x + '" y1="' + geo.yBase
        + '" x2="' + (caixa[2] - geo.pad.x) + '" y2="' + geo.yBase + '"/>'
      + '<polyline class="spark__linha" points="' + geo.pontos.join(' ') + '"/>'
      + '<circle class="spark__ponto" cx="' + geo.fim.x + '" cy="' + geo.fim.y + '" r="4"/>';

    animarTracado(svg.querySelector('.spark__linha'));
  }

  /* A linha se desenha da esquerda para a direita a cada troca — é o
     movimento que dá a leitura de série em curso, não enfeite. */
  function animarTracado(linha) {
    if (!linha || menosMovimento || typeof linha.getTotalLength !== 'function') return;
    const total = linha.getTotalLength();
    linha.style.transition = 'none';
    linha.style.strokeDasharray = total;
    linha.style.strokeDashoffset = total;
    void linha.getBoundingClientRect();  /* força o reflow antes de animar */
    linha.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.22, 0.61, 0.36, 1)';
    linha.style.strokeDashoffset = '0';
  }

  function rotuloAcessivel(serie, variacao) {
    const precos = serie.precos;
    const sentido = variacao > 0 ? 'alta de ' + variacao + '%'
                  : variacao < 0 ? 'queda de ' + Math.abs(variacao) + '%'
                  : 'estabilidade';
    return 'Série de preço de ' + serie.rotulo + ' no atacado do CEASA-SE, de janeiro a março de 2026: '
      + sentido + ' sobre a média de janeiro, de ' + moeda.format(serie.base) + ' para '
      + moeda.format(precos[precos.length - 1]) + ' por quilo na última coleta.';
  }

  /* Mesma matemática da sparkline do mural, em caixa grande: a série
     normalizada entre o mínimo e o máximo, com folga para a linha não
     encostar na borda. Série constante vai para o meio da caixa. */
  function geometria(serie, base, W, H) {
    const PAD_X = 10, PAD_Y = 18;
    const min = Math.min.apply(null, serie);
    const max = Math.max.apply(null, serie);
    const amplitude = max - min;
    const piso = H - PAD_Y;

    const coords = serie.map(function (v, i) {
      const x = PAD_X + (i / (serie.length - 1)) * (W - 2 * PAD_X);
      const y = amplitude === 0
        ? H / 2
        : PAD_Y + (1 - (v - min) / amplitude) * (H - 2 * PAD_Y);
      return { x: +x.toFixed(1), y: +y.toFixed(1) };
    });

    const escalaY = function (v) {
      return amplitude === 0 ? H / 2 : +(PAD_Y + (1 - (v - min) / amplitude) * (H - 2 * PAD_Y)).toFixed(1);
    };

    const pontos = coords.map(function (p) { return p.x + ',' + p.y; });
    const fim = coords[coords.length - 1];
    const area = 'M ' + coords[0].x + ',' + piso
               + ' L ' + pontos.join(' L ')
               + ' L ' + fim.x + ',' + piso + ' Z';

    return {
      pontos: pontos,
      area: area,
      fim: fim,
      yBase: escalaY(base),
      pad: { x: PAD_X, y: PAD_Y }
    };
  }
})();
