/* ============================================================
   cobweb · explorador de séries de preço
   ============================================================
   Um gráfico só, 54 séries. O leitor escolhe em dois estágios:
   primeiro o produto, depois quais canais de coleta entram no
   desenho. Tudo que aparece na tela (cartões, estatísticas, nota
   de unidade, rótulo do gráfico) é calculado a partir do JSON, de
   modo que atualizar a série não pede reescrever a página.

   A escolha vive na barra de endereço (?p=produto&c=canais), então
   um link para uma série específica continua sendo compartilhável
   depois que as fichas individuais deixaram de existir.
   ============================================================ */

(function () {
  'use strict';

  const painel = document.querySelector('[data-series-precos]');
  if (!painel || typeof Chart === 'undefined') return;

  const el = {
    busca: painel.querySelector('[data-busca]'),
    lista: painel.querySelector('[data-lista]'),
    canais: painel.querySelector('[data-canais]'),
    aviso: painel.querySelector('[data-aviso]')
  };
  const canvas = document.querySelector('[data-grafico]');
  const cartoes = document.querySelector('[data-cartoes]');
  const notaUnidade = document.querySelector('[data-nota-unidade]');
  const status = document.querySelector('[data-status]');

  /* As cores das séries são tokens do cobweb.css: lidas daqui, o gráfico
     acompanha qualquer ajuste de paleta sem duplicar valor. */
  const tema = getComputedStyle(document.documentElement);
  const token = (nome, alternativa) => (tema.getPropertyValue(nome) || alternativa).trim();

  const CANAIS = [
    { chave: 'atacado_ceasa', sigla: 'atacado', cor: token('--serie-atacado', '#1d9e75'), traco: [] },
    { chave: 'varejo_mercado_central', sigla: 'mercado-central', cor: token('--serie-varejo-mc', '#a0762a'), traco: [4, 4] },
    { chave: 'varejo_augusto_franco', sigla: 'augusto-franco', cor: token('--serie-varejo-af', '#3a6ea5'), traco: [2, 3] }
  ];

  const escuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const cores = {
    grade: escuro ? 'rgba(240, 238, 229, 0.08)' : 'rgba(26, 26, 26, 0.08)',
    texto: escuro ? '#b4b2a9' : '#888780',
    dicaFundo: escuro ? 'rgba(240, 238, 229, 0.95)' : 'rgba(20, 20, 20, 0.92)',
    dicaTexto: escuro ? '#14140f' : '#ffffff'
  };

  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const dataCurta = (iso) => {
    const partes = iso.split('-');
    return parseInt(partes[2], 10) + '/' + MESES[parseInt(partes[1], 10) - 1];
  };

  const dataLonga = (iso) => {
    const partes = iso.split('-');
    return parseInt(partes[2], 10) + '/' + MESES[parseInt(partes[1], 10) - 1] + '/' + partes[0];
  };

  const moeda = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  /* '2026-01 a 2026-07' → 'janeiro a julho de 2026'. */
  const janelaLegivel = (janela) => {
    const extremos = janela.split(' a ');
    if (extremos.length !== 2) return janela;
    const inicio = extremos[0].split('-');
    const fim = extremos[1].split('-');
    const mes = (p) => MESES_LONGOS[parseInt(p[1], 10) - 1];
    return inicio[0] === fim[0]
      ? mes(inicio) + ' a ' + mes(fim) + ' de ' + fim[0]
      : mes(inicio) + ' de ' + inicio[0] + ' a ' + mes(fim) + ' de ' + fim[0];
  };

  /* Busca sem acento: separa o diacrítico da letra e descarta a marca, para
     que "limao" encontre "Limão" e "morango" continue encontrando morango. */
  const simplificar = (texto) =>
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  let dados = null;
  let grafico = null;
  let produtoAtivo = null;
  let canaisAtivos = [];
  let aberta = false;
  let realcada = -1;      // índice da opção sob o teclado
  let visiveis = [];      // chaves dos produtos que a busca deixou na lista

  fetch(painel.dataset.json)
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(iniciar)
    .catch((erro) => {
      console.error('CobWeb: falha ao carregar as séries de preço', erro);
      if (el.vazio) {
        el.vazio.hidden = false;
        el.vazio.textContent = 'Não foi possível carregar a série de preços. Recarregue a página.';
      }
    });

  /* ----------------------------------------------------------
     Partida
     ---------------------------------------------------------- */

  function iniciar(json) {
    dados = json;

    const inicial = lerEndereco();
    produtoAtivo = inicial.produto;
    canaisAtivos = inicial.canais;

    escreverResumo();
    ligarCombo();
    if (el.canais) el.canais.addEventListener('click', aoClicarCanal);

    desenhar();
  }

  /* A meta strip descreve a cobertura do arquivo, não uma cobertura escrita à
     mão: quando a série crescer, o cabeçalho cresce junto. */
  function escreverResumo() {
    const janela = document.querySelector('[data-resumo-janela]');
    const cobertura = document.querySelector('[data-resumo-cobertura]');
    const atacado = dados.meta.canais.atacado_ceasa;
    const comVarejo = Object.keys(dados.produtos)
      .filter((k) => canaisDoProduto(k).length > 1).length;

    if (janela) janela.textContent = janelaLegivel(atacado.janela);
    if (cobertura) {
      cobertura.textContent = dados.meta.n_produtos + ' produtos · ' + atacado.n_datas
        + ' coletas no atacado · ' + comVarejo + ' com varejo';
    }
  }

  /* Endereço da página → seleção. Um produto que não existe no JSON cai no
     primeiro produto com os três canais, e não num erro. */
  function lerEndereco() {
    const busca = new URLSearchParams(window.location.search);
    const pedido = busca.get('p');
    const produtos = dados.produtos;
    const produto = pedido && produtos[pedido] ? pedido : produtoPadrao();

    const siglas = (busca.get('c') || '').split(',').filter(Boolean);
    const pedidos = CANAIS.filter((c) => siglas.indexOf(c.sigla) !== -1).map((c) => c.chave);
    const disponiveis = canaisDoProduto(produto);
    const escolhidos = pedidos.filter((c) => disponiveis.indexOf(c) !== -1);

    return { produto: produto, canais: escolhidos.length ? escolhidos : disponiveis };
  }

  function produtoPadrao() {
    const chaves = Object.keys(dados.produtos);
    const comVarejo = chaves.filter((k) => canaisDoProduto(k).length > 1);
    return (comVarejo.length ? comVarejo : chaves)[0];
  }

  function canaisDoProduto(chave) {
    const ficha = dados.produtos[chave];
    return CANAIS.filter((c) => ficha && ficha[c.chave]).map((c) => c.chave);
  }

  function escreverEndereco() {
    const siglas = CANAIS.filter((c) => canaisAtivos.indexOf(c.chave) !== -1).map((c) => c.sigla);
    const busca = '?p=' + produtoAtivo + (siglas.length ? '&c=' + siglas.join(',') : '');
    window.history.replaceState(null, '', busca + window.location.hash);
  }

  /* ----------------------------------------------------------
     Estágio 1 · produto, num campo com sugestões
     ---------------------------------------------------------- */

  function ligarCombo() {
    if (!el.busca || !el.lista) return;
    el.busca.value = dados.produtos[produtoAtivo].label;

    el.busca.addEventListener('input', function () {
      abrir(el.busca.value);
    });

    /* Clicar no campo abre a lista inteira e seleciona o texto: quem veio
       navegar vê os 54; quem veio digitar sobrescreve o nome atual. */
    el.busca.addEventListener('focus', function () {
      el.busca.select();
      abrir('');
    });

    /* Clicar num campo que já está com o foco não dispara focus de novo. Sem
       este par, reabrir a lista depois de um Escape exigiria sair do campo e
       voltar. */
    el.busca.addEventListener('click', function () {
      if (!aberta) abrir('');
    });

    el.busca.addEventListener('keydown', aoTeclar);

    /* mousedown, e não click: o clique só chegaria depois do blur, que já
       teria fechado a lista e desfeito a escolha. */
    el.lista.addEventListener('mousedown', function (evento) {
      const opcao = evento.target.closest('[data-produto]');
      if (!opcao) return;
      evento.preventDefault();
      escolher(opcao.dataset.produto);
    });

    document.addEventListener('click', function (evento) {
      if (!painel.contains(evento.target)) fechar();
    });

    el.busca.addEventListener('blur', fechar);
  }

  function abrir(termo) {
    const busca = simplificar(termo);
    const rotuloAtual = simplificar(dados.produtos[produtoAtivo].label);

    /* Campo intocado desde a última escolha lista tudo: o nome que está lá é
       rótulo do estado, não busca que o leitor acabou de digitar. */
    const filtrar = busca && busca !== rotuloAtual;
    const posicao = (chave) => simplificar(dados.produtos[chave].label).indexOf(busca);

    visiveis = Object.keys(dados.produtos).filter((chave) => !filtrar || posicao(chave) !== -1);

    /* Quem começa pelo termo vem primeiro: buscando "co", coco e coentro
       interessam mais do que amendoim com casca cozido. Dentro de cada grupo
       a ordem alfabética do arquivo se mantém. */
    if (filtrar) {
      visiveis.sort((a, b) => (posicao(a) === 0 ? 0 : 1) - (posicao(b) === 0 ? 0 : 1));
    }

    el.lista.innerHTML = '';

    if (!visiveis.length) {
      const vazio = document.createElement('li');
      vazio.className = 'combo__vazio';
      vazio.textContent = 'Nenhum produto com esse nome na série.';
      el.lista.appendChild(vazio);
    } else {
      visiveis.forEach((chave, indice) => {
        const ficha = dados.produtos[chave];
        const canais = canaisDoProduto(chave).length;
        const opcao = document.createElement('li');
        opcao.className = 'combo__opcao';
        opcao.id = 'opcao-' + chave;
        opcao.setAttribute('role', 'option');
        opcao.setAttribute('aria-selected', String(chave === produtoAtivo));
        opcao.dataset.produto = chave;
        opcao.dataset.indice = String(indice);
        opcao.innerHTML = '<span>' + ficha.label + '</span>'
          + '<span class="combo__opcao__meta">' + (canais > 1 ? canais + ' canais' : 'atacado') + '</span>';
        el.lista.appendChild(opcao);
      });
    }

    el.lista.hidden = false;
    el.busca.setAttribute('aria-expanded', 'true');
    aberta = true;
    realcar(visiveis.indexOf(produtoAtivo));
  }

  function fechar() {
    if (!aberta) return;
    el.lista.hidden = true;
    el.busca.setAttribute('aria-expanded', 'false');
    el.busca.removeAttribute('aria-activedescendant');
    /* O campo volta a mostrar o produto desenhado: busca abandonada no meio
       não pode deixar o rótulo dizendo uma coisa e o gráfico outra. */
    el.busca.value = dados.produtos[produtoAtivo].label;
    aberta = false;
    realcada = -1;
  }

  function realcar(indice) {
    const opcoes = el.lista.querySelectorAll('[data-produto]');
    if (!opcoes.length) return;
    realcada = Math.max(0, Math.min(indice, opcoes.length - 1));

    opcoes.forEach((opcao, i) => opcao.classList.toggle('is-ativa', i === realcada));
    const ativa = opcoes[realcada];
    el.busca.setAttribute('aria-activedescendant', ativa.id);

    /* Rola só a caixa da lista, nunca a página. */
    const topo = ativa.offsetTop - el.lista.offsetTop;
    if (topo < el.lista.scrollTop) el.lista.scrollTop = topo;
    else if (topo + ativa.offsetHeight > el.lista.scrollTop + el.lista.clientHeight) {
      el.lista.scrollTop = topo + ativa.offsetHeight - el.lista.clientHeight;
    }
  }

  function aoTeclar(evento) {
    const tecla = evento.key;

    if (tecla === 'ArrowDown' || tecla === 'ArrowUp') {
      evento.preventDefault();
      if (!aberta) return abrir('');
      return realcar(realcada + (tecla === 'ArrowDown' ? 1 : -1));
    }
    if (tecla === 'Home' && aberta) { evento.preventDefault(); return realcar(0); }
    if (tecla === 'End' && aberta) { evento.preventDefault(); return realcar(visiveis.length - 1); }
    if (tecla === 'Enter' && aberta && visiveis[realcada]) {
      evento.preventDefault();
      return escolher(visiveis[realcada]);
    }
    if (tecla === 'Escape' && aberta) {
      evento.preventDefault();
      return fechar();
    }
  }

  function escolher(chave) {
    fechar();
    if (chave === produtoAtivo) return;

    produtoAtivo = chave;
    el.busca.value = dados.produtos[chave].label;

    /* Troca de produto preserva os canais que o novo produto também tem; os
       que ele não tem saem da seleção em vez de virar linha vazia. */
    const disponiveis = canaisDoProduto(produtoAtivo);
    const mantidos = canaisAtivos.filter((c) => disponiveis.indexOf(c) !== -1);
    canaisAtivos = mantidos.length ? mantidos : disponiveis;

    desenhar();
  }

  /* ----------------------------------------------------------
     Estágio 2 · canais
     ---------------------------------------------------------- */

  function aoClicarCanal(evento) {
    const botao = evento.target.closest('[data-canal]');
    if (!botao || botao.disabled) return;

    const canal = botao.dataset.canal;
    const posicao = canaisAtivos.indexOf(canal);

    /* Desligar o último canal deixaria um gráfico vazio sem dizer por quê:
       o clique que faria isso é ignorado. */
    if (posicao !== -1 && canaisAtivos.length === 1) return;
    if (posicao === -1) canaisAtivos.push(canal); else canaisAtivos.splice(posicao, 1);

    desenhar();
  }

  function montarBotoesDeCanal() {
    if (!el.canais) return;
    const disponiveis = canaisDoProduto(produtoAtivo);
    el.canais.innerHTML = '';

    CANAIS.forEach((canal) => {
      const meta = dados.meta.canais[canal.chave];
      const tem = disponiveis.indexOf(canal.chave) !== -1;
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'serie-btn';
      botao.dataset.canal = canal.chave;
      botao.disabled = !tem;
      botao.setAttribute('aria-pressed', String(tem && canaisAtivos.indexOf(canal.chave) !== -1));
      botao.innerHTML = '<span class="serie-btn__cor" style="background:' + canal.cor + '"></span>';
      botao.appendChild(document.createTextNode(meta.label));
      if (!tem) botao.title = 'Sem coleta deste produto no canal ' + meta.label;
      el.canais.appendChild(botao);
    });

    if (el.aviso) {
      const semVarejo = disponiveis.length === 1;
      el.aviso.textContent = semVarejo
        ? 'Este produto só tem coleta no atacado. Os dois canais de varejo cobrem os 11 produtos '
          + 'da cesta acompanhada pela EMDAGRO no primeiro trimestre.'
        : 'O atacado vai de janeiro a julho; os dois canais de varejo param em março. '
          + 'A diferença de janela é da fonte, não do recorte.';
    }
  }

  /* ----------------------------------------------------------
     Desenho
     ---------------------------------------------------------- */

  function desenhar() {
    montarBotoesDeCanal();
    const ficha = dados.produtos[produtoAtivo];
    const unidade = unidadeDoProduto(ficha);

    escreverTitulo(ficha, unidade);
    desenharGrafico(ficha, unidade);
    desenharCartoes(ficha, unidade);
    escreverNotaDeUnidade(ficha, unidade);
    anunciar(ficha, unidade);
    escreverEndereco();
  }

  /* Sem a lista de produtos sempre aberta, é o título que diz o que está
     desenhado — e ele descreve a série, não o produto em abstrato. */
  function escreverTitulo(ficha, unidade) {
    const titulo = document.querySelector('[data-titulo-serie]');
    const meta = document.querySelector('[data-subtitulo-serie]');
    if (titulo) titulo.textContent = ficha.label;
    if (!meta) return;

    const nomes = CANAIS.filter((c) => canaisAtivos.indexOf(c.chave) !== -1)
      .map((c) => dados.meta.canais[c.chave].label_curto || dados.meta.canais[c.chave].label);
    meta.textContent = unidade.legenda + ' · ' + nomes.join(', ') + ' · '
      + janelaLegivel(janelaDosCanais());
  }

  /* Produto cotado por peso vira R$/kg; produto cotado por cento ou por caixa
     de dúzias fica na unidade do boletim, porque a fonte não publica peso por
     peça e estimá-lo seria inventar número. */
  function unidadeDoProduto(ficha) {
    const atacado = ficha.atacado_ceasa;
    if (atacado.precos_rs_kg) {
      return { campo: 'precos_rs_kg', sufixo: '/kg', legenda: 'R$ por quilo' };
    }
    const nome = atacado.unidade_origem.toLowerCase();
    return {
      campo: 'precos_unidade_origem',
      sufixo: '/' + nome,
      legenda: 'R$ por ' + nome
    };
  }

  function serieDoCanal(ficha, chave, unidade) {
    const bloco = ficha[chave];
    if (!bloco) return null;
    const valores = bloco[unidade.campo] || bloco.precos_unidade_origem;
    return { datas: dados.meta.canais[chave].datas, valores: valores };
  }

  function desenharGrafico(ficha, unidade) {
    if (!canvas) return;
    if (grafico) grafico.destroy();

    /* União ordenada das datas dos canais escolhidos: os boletins não coletam
       nos mesmos dias, e forçar uma grade comum inventaria leitura. */
    const todas = {};
    canaisAtivos.forEach((chave) => {
      dados.meta.canais[chave].datas.forEach((d) => { todas[d] = true; });
    });
    const eixo = Object.keys(todas).sort();

    const conjuntos = CANAIS.filter((c) => canaisAtivos.indexOf(c.chave) !== -1).map((canal) => {
      const serie = serieDoCanal(ficha, canal.chave, unidade);
      const mapa = {};
      serie.datas.forEach((d, i) => { mapa[d] = serie.valores[i]; });
      return {
        label: dados.meta.canais[canal.chave].label,
        data: eixo.map((d) => (d in mapa ? mapa[d] : null)),
        borderColor: canal.cor,
        backgroundColor: 'transparent',
        borderDash: canal.traco,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: eixo.length > 30 ? 1.5 : 2.5,
        pointHoverRadius: 5,
        spanGaps: true
      };
    });

    grafico = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: eixo.map(dataCurta), datasets: conjuntos },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: cores.dicaFundo,
            titleColor: cores.dicaTexto,
            bodyColor: cores.dicaTexto,
            padding: 10,
            cornerRadius: 4,
            callbacks: {
              label: (item) => (item.parsed.y == null
                ? null
                : ' ' + item.dataset.label + ': ' + moeda(item.parsed.y) + unidade.sufixo)
            }
          }
        },
        scales: {
          x: {
            grid: { color: cores.grade, drawBorder: false },
            ticks: {
              color: cores.texto,
              font: { family: 'Inter, sans-serif', size: 11 },
              maxRotation: 0,
              autoSkipPadding: 16
            }
          },
          y: {
            grid: { color: cores.grade, drawBorder: false },
            ticks: {
              color: cores.texto,
              font: { family: 'Inter, sans-serif', size: 11 },
              callback: (v) => moeda(v)
            }
          }
        }
      }
    });
  }

  function desenharCartoes(ficha, unidade) {
    if (!cartoes) return;
    cartoes.innerHTML = '';
    /* Um cartão sozinho não estica pela largura toda: um número grande num
       campo vazio lê como destaque editorial, e aqui é só a série que sobrou. */
    cartoes.style.gridTemplateColumns = canaisAtivos.length === 1
      ? 'minmax(240px, 340px)'
      : 'repeat(' + Math.min(canaisAtivos.length, 3) + ', 1fr)';

    CANAIS.filter((c) => canaisAtivos.indexOf(c.chave) !== -1).forEach((canal) => {
      const serie = serieDoCanal(ficha, canal.chave, unidade);
      const valores = serie.valores.filter((v) => v !== null);
      if (!valores.length) return;

      const primeiro = valores[0];
      const ultimo = valores[valores.length - 1];
      const variacao = primeiro ? ((ultimo - primeiro) / primeiro) * 100 : 0;
      const classe = variacao > 0.5 ? 'delta-up' : (variacao < -0.5 ? 'delta-down' : 'delta-flat');
      const sinal = variacao > 0.5 ? '+' : (variacao < -0.5 ? '−' : '±');
      const meta = dados.meta.canais[canal.chave];

      const cartao = document.createElement('article');
      cartao.className = 'index-card';
      cartao.innerHTML =
        '<header class="index-card__header">'
        + '<span class="index-card__name">' + (meta.label_curto || meta.label) + '</span>'
        + '<span class="index-card__source">' + valores.length + ' coletas</span>'
        + '</header>'
        + '<div class="index-card__value">'
        + '<span class="index-card__number">' + moeda(ultimo) + '</span>'
        + '<span class="index-card__delta ' + classe + '">' + sinal
        + Math.abs(variacao).toFixed(0) + '%</span>'
        + '</div>'
        + '<div class="index-card__base">' + dataLonga(serie.datas[serie.datas.length - 1])
        + ' · ' + unidade.sufixo.slice(1) + ' · vs. primeira coleta</div>'
        + '<div class="index-card__base" style="margin-top:6px;">mín ' + moeda(Math.min.apply(null, valores))
        + ' · máx ' + moeda(Math.max.apply(null, valores)) + '</div>';
      cartoes.appendChild(cartao);
    });
  }

  function escreverNotaDeUnidade(ficha, unidade) {
    if (!notaUnidade) return;
    const atacado = ficha.atacado_ceasa;
    const texto = atacado.precos_rs_kg
      ? 'No atacado, ' + ficha.label.toLowerCase() + ' é cotado por ' + atacado.unidade_origem
        + '. A conversão divide o preço do boletim por ' + atacado.fator_conversao_kg
        + ', o peso nominal da embalagem.'
      : 'No atacado, ' + ficha.label.toLowerCase() + ' é cotado por ' + atacado.unidade_origem
        + ' (' + atacado.itens_por_unidade + ' unidades), e o gráfico mantém essa unidade: a EMDAGRO '
        + 'não publica peso por peça, e estimá-lo seria inventar número.';
    notaUnidade.textContent = texto;
  }

  /* A janela anunciada é a dos canais escolhidos, não a do arquivo: com só o
     varejo na tela, dizer "janeiro a julho" descreveria o que não está lá. */
  function janelaDosCanais() {
    const janelas = canaisAtivos.map((c) => dados.meta.canais[c].janela).sort();
    const inicio = janelas[0].split(' a ')[0];
    const fim = janelas.map((j) => j.split(' a ')[1]).sort().pop();
    return inicio + ' a ' + fim;
  }

  function anunciar(ficha, unidade) {
    const nomes = CANAIS.filter((c) => canaisAtivos.indexOf(c.chave) !== -1)
      .map((c) => dados.meta.canais[c.chave].label);
    const lista = nomes.length > 1
      ? nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1]
      : nomes[0];
    const descricao = 'Série de preço de ' + ficha.label.toLowerCase() + ' em ' + unidade.legenda
      + ', ' + lista + ', ' + janelaLegivel(janelaDosCanais()) + '.';

    if (canvas) {
      canvas.setAttribute('aria-label', descricao);
      canvas.textContent = descricao + ' Os valores de cada coleta estão nos cartões abaixo do gráfico.';
    }
    if (status) status.textContent = descricao;
  }
})();
