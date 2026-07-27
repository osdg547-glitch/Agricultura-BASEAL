/*
 * Mapa temático da laranja nos municípios de Sergipe.
 *
 * JS puro, sem dependências. Projeção equirretangular com correção de cosseno
 * da latitude, suficiente para a extensão de Sergipe (cerca de 2 graus).
 *
 * Dados: IBGE, Produção Agrícola Municipal, tabela 1613.
 * Malha: IBGE, simplificada com preservação de topologia.
 */
(function (raiz) {
  'use strict';

  var PADRAO = {
    geojson: 'dados/se-municipios.geojson',
    dados: 'dados/laranja-municipios.json',
    variavel: 'area',
    ano: 2024,
    largura: 620,
    altura: 700,
    margem: 12
  };

  var fmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  var fmt1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  /* ---------- geometria ---------- */

  function calcularBbox(features) {
    var b = { oeste: Infinity, leste: -Infinity, sul: Infinity, norte: -Infinity };
    features.forEach(function (f) {
      f.geometry.coordinates.forEach(function (anel) {
        anel.forEach(function (p) {
          if (p[0] < b.oeste) b.oeste = p[0];
          if (p[0] > b.leste) b.leste = p[0];
          if (p[1] < b.sul) b.sul = p[1];
          if (p[1] > b.norte) b.norte = p[1];
        });
      });
    });
    return b;
  }

  function criarProjecao(bbox, largura, altura, margem) {
    // A correção de cosseno evita que o estado apareça esticado na horizontal.
    var k = Math.cos(((bbox.sul + bbox.norte) / 2) * Math.PI / 180);
    var larguraGeo = (bbox.leste - bbox.oeste) * k;
    var alturaGeo = bbox.norte - bbox.sul;
    var escala = Math.min(
      (largura - 2 * margem) / larguraGeo,
      (altura - 2 * margem) / alturaGeo
    );
    var deslocX = (largura - larguraGeo * escala) / 2;
    var deslocY = (altura - alturaGeo * escala) / 2;
    return function (lon, lat) {
      return [
        deslocX + (lon - bbox.oeste) * k * escala,
        deslocY + (bbox.norte - lat) * escala
      ];
    };
  }

  function construirPath(geometria, projetar) {
    var partes = [];
    geometria.coordinates.forEach(function (anel) {
      var d = '';
      for (var i = 0; i < anel.length; i++) {
        var p = projetar(anel[i][0], anel[i][1]);
        d += (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
      }
      partes.push(d + 'Z');
    });
    return partes.join('');
  }

  /* ---------- classificação ---------- */

  function classificar(valor, cortes) {
    if (valor === null || valor === undefined) return 'sem-info';
    if (valor <= 0) return 'zero';
    for (var i = 0; i < cortes.length; i++) {
      if (valor <= cortes[i]) return 'c' + (i + 1);
    }
    return 'c' + (cortes.length + 1);
  }

  function rotulosLegenda(cortes, unidade) {
    var itens = [
      { classe: 'sem-info', rotulo: 'Sem informação' },
      { classe: 'zero', rotulo: 'Sem produção registrada' }
    ];
    for (var i = 0; i <= cortes.length; i++) {
      var rotulo;
      if (i === 0) {
        rotulo = 'Até ' + fmt.format(cortes[0]) + ' ' + unidade;
      } else if (i === cortes.length) {
        rotulo = 'Mais de ' + fmt.format(cortes[i - 1]) + ' ' + unidade;
      } else {
        rotulo = fmt.format(cortes[i - 1]) + ' a ' + fmt.format(cortes[i]) + ' ' + unidade;
      }
      itens.push({ classe: 'c' + (i + 1), rotulo: rotulo });
    }
    return itens;
  }

  function formatar(valor, unidade) {
    if (valor === null || valor === undefined) return 'sem informação';
    if (valor === 0) return 'sem produção registrada';
    return (valor < 10 ? fmt1.format(valor) : fmt.format(valor)) + ' ' + unidade;
  }

  /* ---------- montagem ---------- */

  function montar(seletor, opcoes) {
    var cfg = {};
    Object.keys(PADRAO).forEach(function (c) { cfg[c] = PADRAO[c]; });
    Object.keys(opcoes || {}).forEach(function (c) { cfg[c] = opcoes[c]; });

    var alvo = typeof seletor === 'string'
      ? document.querySelector(seletor)
      : seletor;
    if (!alvo) return;

    Promise.all([
      fetch(cfg.geojson).then(function (r) { return r.json(); }),
      fetch(cfg.dados).then(function (r) { return r.json(); })
    ]).then(function (res) {
      renderizar(alvo, res[0], res[1], cfg);
    }).catch(function (erro) {
      alvo.innerHTML = '<p class="cw-mapa-erro">Não foi possível carregar o mapa.</p>';
      console.error('mapa da laranja:', erro);
    });
  }

  function renderizar(alvo, geo, dados, cfg) {
    var estado = { variavel: cfg.variavel, ano: cfg.ano };
    var projetar = criarProjecao(
      calcularBbox(geo.features), cfg.largura, cfg.altura, cfg.margem
    );

    // Estrutura fixa: controles, legenda, mapa, nota. O caminho de cada
    // município é calculado uma vez; só o preenchimento muda depois.
    alvo.classList.add('cw-mapa');
    alvo.innerHTML =
      '<div class="cw-mapa-controles" role="group" aria-label="Variável exibida"></div>' +
      '<div class="cw-mapa-ano"></div>' +
      '<ul class="cw-mapa-legenda"></ul>' +
      '<div class="cw-mapa-palco">' +
      '<svg class="cw-mapa-svg" viewBox="0 0 ' + cfg.largura + ' ' + cfg.altura + '" ' +
      'role="img" aria-labelledby="cw-mapa-titulo"><title id="cw-mapa-titulo"></title></svg>' +
      '<div class="cw-mapa-dica" hidden></div>' +
      '</div>' +
      '<p class="cw-mapa-nota"></p>';

    var svg = alvo.querySelector('.cw-mapa-svg');
    var dica = alvo.querySelector('.cw-mapa-dica');
    var palco = alvo.querySelector('.cw-mapa-palco');
    var ns = 'http://www.w3.org/2000/svg';

    var formas = geo.features.map(function (f) {
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', construirPath(f.geometry, projetar));
      path.setAttribute('class', 'cw-mapa-mun');
      path.appendChild(document.createElementNS(ns, 'title'));
      svg.appendChild(path);
      return { path: path, cod: f.properties.id, nome: f.properties.name };
    });

    /* ---- controles de variável ---- */
    var controles = alvo.querySelector('.cw-mapa-controles');
    Object.keys(dados.variaveis).forEach(function (chave) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cw-mapa-opcao';
      b.textContent = dados.variaveis[chave].rotulo;
      b.setAttribute('data-variavel', chave);
      b.addEventListener('click', function () {
        estado.variavel = chave;
        atualizar();
      });
      controles.appendChild(b);
    });

    /* ---- controle de ano ---- */
    var anos = dados.anos;
    var caixaAno = alvo.querySelector('.cw-mapa-ano');
    caixaAno.innerHTML =
      '<label for="cw-mapa-ano-input">Ano</label>' +
      '<input id="cw-mapa-ano-input" type="range" step="1" min="' + anos[0] +
      '" max="' + anos[anos.length - 1] + '" value="' + estado.ano + '">' +
      '<output class="cw-mapa-ano-valor"></output>';
    var entradaAno = caixaAno.querySelector('input');
    var saidaAno = caixaAno.querySelector('output');
    entradaAno.addEventListener('input', function () {
      estado.ano = parseInt(entradaAno.value, 10);
      atualizar();
    });

    /* ---- interação ---- */
    formas.forEach(function (forma) {
      forma.path.addEventListener('mouseenter', function () {
        var reg = dados.municipios[forma.cod];
        var v = valorDe(reg, estado);
        var meta = dados.variaveis[estado.variavel];
        dica.innerHTML =
          '<strong>' + forma.nome + '</strong>' +
          '<span>' + meta.rotulo.toLowerCase() + ': ' +
          formatar(v, meta.unidade) + '</span>';
        dica.hidden = false;
        forma.path.classList.add('em-destaque');
      });
      forma.path.addEventListener('mousemove', function (ev) {
        var caixa = palco.getBoundingClientRect();
        dica.style.left = (ev.clientX - caixa.left) + 'px';
        dica.style.top = (ev.clientY - caixa.top) + 'px';
      });
      forma.path.addEventListener('mouseleave', function () {
        dica.hidden = true;
        forma.path.classList.remove('em-destaque');
      });
    });

    function valorDe(reg, est) {
      if (!reg) return null;
      var i = anos.indexOf(est.ano);
      if (i < 0) return null;
      var serie = reg[est.variavel];
      return serie ? serie[i] : null;
    }

    function atualizar() {
      var meta = dados.variaveis[estado.variavel];
      var i = anos.indexOf(estado.ano);

      formas.forEach(function (forma) {
        var v = valorDe(dados.municipios[forma.cod], estado);
        forma.path.setAttribute('class',
          'cw-mapa-mun cw-mapa-' + classificar(v, meta.cortes));
        forma.path.firstChild.textContent =
          forma.nome + ': ' + formatar(v, meta.unidade);
      });

      Array.prototype.forEach.call(
        controles.querySelectorAll('.cw-mapa-opcao'),
        function (b) {
          var ativo = b.getAttribute('data-variavel') === estado.variavel;
          b.classList.toggle('ativo', ativo);
          b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        }
      );

      var legenda = alvo.querySelector('.cw-mapa-legenda');
      legenda.innerHTML = rotulosLegenda(meta.cortes, meta.unidade)
        .map(function (item) {
          return '<li><span class="cw-mapa-chave cw-mapa-' + item.classe +
            '"></span>' + item.rotulo + '</li>';
        }).join('');

      saidaAno.textContent = estado.ano;
      entradaAno.value = estado.ano;

      // Total estadual do ano, somando apenas os municípios com dado.
      var total = 0, comDado = 0;
      Object.keys(dados.municipios).forEach(function (cod) {
        var s = dados.municipios[cod][estado.variavel];
        if (s && s[i] !== null && s[i] !== undefined) {
          comDado++;
          if (s[i] > 0) total += s[i];
        }
      });

      svg.querySelector('title').textContent =
        meta.rotulo + ' de laranja por município em Sergipe, ' + estado.ano + '.';

      var nota = estado.variavel === 'rend'
        ? 'Rendimento é razão entre quantidade e área, por isso não se soma entre municípios.'
        : 'Total do estado em ' + estado.ano + ': ' + fmt.format(total) + ' ' + meta.unidade + '.';
      alvo.querySelector('.cw-mapa-nota').textContent =
        nota + ' ' + comDado + ' dos 75 municípios têm valor informado nesse ano. ' +
        'Fonte: IBGE, Produção Agrícola Municipal, tabela 1613.' +
        (estado.ano === anos[anos.length - 1] ? ' Dados preliminares.' : '');
    }

    atualizar();
  }

  raiz.CobWebMapaLaranja = {
    montar: montar,
    _internos: {
      calcularBbox: calcularBbox,
      criarProjecao: criarProjecao,
      construirPath: construirPath,
      classificar: classificar,
      rotulosLegenda: rotulosLegenda,
      formatar: formatar
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
