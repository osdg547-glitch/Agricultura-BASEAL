/* ============================================================
   cobweb · vitrine das séries de preço
   ============================================================
   A home mostra uma série por vez: o painel troca de produto a
   cada dez segundos e percorre as 54 séries do atacado, com o
   link de cada uma para a página de produtos.

   Tudo — nome, unidade, preço, variação, janela, contagens do
   cabeçalho — sai do JSON, com as mesmas convenções do explorador
   em produtos/: variação contra a primeira coleta, produto cotado
   por cento ou por caixa de dúzias mantido na unidade do boletim.
   Atualizar a série não pede reescrever a home.

   Cores: nenhuma cor aqui. O painel recebe a classe de tendência
   (painel--alta, --baixa, --estavel) e o cobweb.css resolve o
   matiz nos dois temas.
   ============================================================ */

(function () {
  'use strict';

  const INTERVALO = 10000;  /* tempo de cada série no painel; casa com a régua do CSS */
  const FADE = 200;         /* precisa casar com a transição do CSS */

  const vitrine = document.querySelector('[data-vitrine]');
  if (!vitrine) return;

  const painel = vitrine.querySelector('[data-painel]');
  if (!painel) return;

  const el = {
    nome:      painel.querySelector('[data-painel-nome]'),
    delta:     painel.querySelector('[data-painel-delta]'),
    preco:     painel.querySelector('[data-painel-preco]'),
    base:      painel.querySelector('[data-painel-base]'),
    grafico:   painel.querySelector('[data-painel-grafico]'),
    eixoIni:   painel.querySelector('[data-painel-eixo-inicio]'),
    eixoFim:   painel.querySelector('[data-painel-eixo-fim]'),
    nota:      painel.querySelector('[data-painel-nota]'),
    resumo:    painel.querySelector('[data-painel-resumo]'),
    link:      painel.querySelector('[data-painel-link]'),
    linkNome:  painel.querySelector('[data-painel-link-nome]'),
    anterior:  painel.querySelector('[data-painel-anterior]'),
    proxima:   painel.querySelector('[data-painel-proxima]'),
    pausa:     painel.querySelector('[data-painel-pausa]'),
    posicao:   painel.querySelector('[data-painel-posicao]')
  };

  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const moeda = function (v) {
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const dataLonga = function (iso) {
    const p = iso.split('-');
    return parseInt(p[2], 10) + '/' + MESES_CURTOS[parseInt(p[1], 10) - 1] + '/' + p[0];
  };

  const mesAno = function (iso) {
    const p = iso.split('-');
    return MESES_CURTOS[parseInt(p[1], 10) - 1] + ' de ' + p[0];
  };

  /* '2026-01 a 2026-07' → 'janeiro a julho de 2026' — mesma leitura da
     página de produtos. */
  const janelaLegivel = function (janela) {
    const extremos = String(janela).split(' a ');
    if (extremos.length !== 2) return janela;
    const ini = extremos[0].split('-'), fim = extremos[1].split('-');
    const mes = function (p) { return MESES[parseInt(p[1], 10) - 1]; };
    return ini[0] === fim[0]
      ? mes(ini) + ' a ' + mes(fim) + ' de ' + fim[0]
      : mes(ini) + ' de ' + ini[0] + ' a ' + mes(fim) + ' de ' + fim[0];
  };

  let dados = null;
  let series = [];      /* uma entrada por produto com série de atacado */
  let atual = 0;
  let timer = null;
  let pausadoPeloLeitor = menosMovimento;  /* sem movimento: começa parado */
  let sobrevoando = false;

  fetch(vitrine.dataset.json)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(iniciar)
    .catch(function (e) {
      console.warn('CobWeb: vitrine não carregada de ' + vitrine.dataset.json, e);
    });

  /* ---------- partida ---------- */

  function iniciar(json) {
    dados = json;
    const canal = dados.meta.canais.atacado_ceasa;

    series = Object.keys(dados.produtos).map(function (chave) {
      const ficha = dados.produtos[chave];
      const atacado = ficha.atacado_ceasa;
      if (!atacado) return null;

      const unidade = unidadeDoProduto(ficha);
      const valores = [];
      const datas = [];
      (atacado[unidade.campo] || []).forEach(function (v, i) {
        if (v !== null && v !== undefined) { valores.push(v); datas.push(canal.datas[i]); }
      });
      if (valores.length < 2) return null;

      return {
        chave: chave,
        rotulo: ficha.label.toLowerCase(),
        unidade: unidade,
        valores: valores,
        datas: datas,
        temVarejo: canaisDoProduto(ficha).length > 1
      };
    }).filter(Boolean);

    if (!series.length) return;

    escreverResumo();
    ligarControles();
    mostrar(indicePadrao(), true);
    if (!pausadoPeloLeitor) agendar();
    sincronizarBotao();
  }

  /* Abre na primeira série com os três canais, como a página de produtos
     faz na ausência de ?p= — e não num produto qualquer da ordem do arquivo. */
  function indicePadrao() {
    for (let i = 0; i < series.length; i++) {
      if (series[i].temVarejo) return i;
    }
    return 0;
  }

  function canaisDoProduto(ficha) {
    return ['atacado_ceasa', 'varejo_mercado_central', 'varejo_augusto_franco']
      .filter(function (c) { return ficha[c]; });
  }

  /* Cada produto tem uma unidade só, escolhida na importação e declarada em
     unidade_referencia: quilo quando algum canal cota por peso, preço por peça
     quando nenhum cota. Todos os canais são publicados nela. */
  function unidadeDoProduto(ficha) {
    const referencia = ficha.unidade_referencia;
    return {
      campo: 'precos_referencia',
      sufixo: referencia.sufixo,
      legenda: referencia.legenda
    };
  }

  /* O cabeçalho descreve a cobertura do arquivo, não uma cobertura escrita à
     mão: quando a série crescer, a home cresce junto. */
  function escreverResumo() {
    const canal = dados.meta.canais.atacado_ceasa;
    const comVarejo = Object.keys(dados.produtos).filter(function (k) {
      return canaisDoProduto(dados.produtos[k]).length > 1;
    }).length;

    const campos = {
      produtos: dados.meta.n_produtos || Object.keys(dados.produtos).length,
      coletas: canal.n_datas || canal.datas.length,
      varejo: comVarejo,
      janela: janelaLegivel(canal.janela)
    };

    Object.keys(campos).forEach(function (nome) {
      document.querySelectorAll('[data-resumo="' + nome + '"]').forEach(function (alvo) {
        alvo.textContent = campos[nome];
      });
    });
  }

  /* ---------- controles de leitura ---------- */

  function ligarControles() {
    /* Sobrevoar ou tabular a vitrine congela a troca: ninguém perde de vista
       a série que estava lendo. */
    vitrine.addEventListener('mouseenter', function () { sobrevoando = true; parar(); });
    vitrine.addEventListener('mouseleave', function () { sobrevoando = false; retomarSePuder(); });
    vitrine.addEventListener('focusin',  function () { sobrevoando = true; parar(); });
    vitrine.addEventListener('focusout', function (ev) {
      if (!vitrine.contains(ev.relatedTarget)) { sobrevoando = false; retomarSePuder(); }
    });

    if (el.anterior) el.anterior.addEventListener('click', function () { passar(-1); });
    if (el.proxima)  el.proxima.addEventListener('click', function () { passar(1); });

    if (el.pausa) {
      el.pausa.addEventListener('click', function () {
        pausadoPeloLeitor = !pausadoPeloLeitor;
        /* Retomar é ordem explícita e vence o congelamento por sobrevoo: o
           botão fica dentro da vitrine, e quem o aperta está com o foco nela. */
        if (pausadoPeloLeitor) parar(); else agendar();
        sincronizarBotao();
      });
    }

    /* Aba em segundo plano não precisa girar. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) parar(); else retomarSePuder();
    });
  }

  /* Passar à mão desliga o giro automático: quem escolheu uma série não
     quer vê-la trocar sozinha três segundos depois. */
  function passar(direcao) {
    pausadoPeloLeitor = true;
    parar();
    sincronizarBotao();
    mostrar((atual + direcao + series.length) % series.length);
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

  function pintar(serie) {
    const valores = serie.valores;
    const primeira = valores[0];
    const ultima = valores[valores.length - 1];

    /* Mesma convenção dos cartões da página de produtos: variação contra a
       primeira coleta da janela, com faixa morta de meio ponto. */
    const variacao = primeira ? ((ultima - primeira) / primeira) * 100 : 0;
    const tendencia = variacao > 0.5 ? 'alta' : variacao < -0.5 ? 'baixa' : 'estavel';

    painel.classList.remove('painel--alta', 'painel--baixa', 'painel--estavel');
    painel.classList.add('painel--' + tendencia);

    el.nome.textContent = serie.rotulo;

    el.delta.textContent = (tendencia === 'alta' ? '+' : tendencia === 'baixa' ? '−' : '±')
      + Math.abs(variacao).toFixed(0) + '%';
    el.delta.className = 'painel__delta '
      + (tendencia === 'alta' ? 'delta-up' : tendencia === 'baixa' ? 'delta-down' : 'delta-flat');

    el.preco.innerHTML = moeda(ultima)
      + '<span class="painel__unid">' + serie.unidade.sufixo + '</span>';

    el.base.textContent = dataLonga(serie.datas[serie.datas.length - 1])
      + ' · ' + serie.unidade.legenda + ' · vs. primeira coleta';

    el.eixoIni.textContent = mesAno(serie.datas[0]);
    el.eixoFim.textContent = mesAno(serie.datas[serie.datas.length - 1]);

    el.nota.textContent = serie.unidade.sufixo === '/kg'
      ? 'Linha tracejada: a primeira coleta, base da variação.'
      : 'Linha tracejada: a primeira coleta. Cotado por ' + serie.unidade.sufixo.slice(1)
        + ', sem conversão para quilo: a fonte não publica peso por peça.';

    el.resumo.textContent = 'Mínimo de ' + moeda(Math.min.apply(null, valores))
      + ' e máximo de ' + moeda(Math.max.apply(null, valores))
      + ' em ' + valores.length + ' coletas.';

    el.link.setAttribute('href', 'produtos/?p=' + serie.chave);
    el.linkNome.textContent = serie.rotulo;

    if (el.posicao) {
      el.posicao.textContent = (series.indexOf(serie) + 1) + ' de ' + series.length;
    }

    desenhar(serie, variacao);
  }

  /* ---------- desenho ---------- */

  function desenhar(serie, variacao) {
    const svg = el.grafico;
    if (!svg) return;

    const caixa = (svg.getAttribute('viewBox') || '0 0 480 220').split(/\s+/).map(Number);
    const geo = geometria(serie.valores, caixa[2], caixa[3]);

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
    const valores = serie.valores;
    const sentido = variacao > 0.5 ? 'alta de ' + variacao.toFixed(0) + '%'
                  : variacao < -0.5 ? 'queda de ' + Math.abs(variacao).toFixed(0) + '%'
                  : 'estabilidade';
    return 'Série de preço de ' + serie.rotulo + ' no atacado do CEASA-SE, '
      + janelaLegivel(dados.meta.canais.atacado_ceasa.janela) + ': ' + sentido
      + ' contra a primeira coleta, de ' + moeda(valores[0]) + ' para '
      + moeda(valores[valores.length - 1]) + ' em ' + serie.unidade.legenda + '.';
  }

  /* Série normalizada entre o mínimo e o máximo, com folga para a linha não
     encostar na borda. Série constante vai para o meio da caixa, e não para o
     piso, que leria como ausência de dado. */
  function geometria(valores, W, H) {
    const PAD_X = 10, PAD_Y = 18;
    const min = Math.min.apply(null, valores);
    const max = Math.max.apply(null, valores);
    const amplitude = max - min;
    const piso = H - PAD_Y;

    const escalaY = function (v) {
      return amplitude === 0
        ? H / 2
        : +(PAD_Y + (1 - (v - min) / amplitude) * (H - 2 * PAD_Y)).toFixed(1);
    };

    const coords = valores.map(function (v, i) {
      return {
        x: +(PAD_X + (i / (valores.length - 1)) * (W - 2 * PAD_X)).toFixed(1),
        y: escalaY(v)
      };
    });

    const pontos = coords.map(function (p) { return p.x + ',' + p.y; });
    const fim = coords[coords.length - 1];
    const area = 'M ' + coords[0].x + ',' + piso
               + ' L ' + pontos.join(' L ')
               + ' L ' + fim.x + ',' + piso + ' Z';

    return {
      pontos: pontos,
      area: area,
      fim: fim,
      yBase: escalaY(valores[0]),
      pad: { x: PAD_X, y: PAD_Y }
    };
  }
})();
