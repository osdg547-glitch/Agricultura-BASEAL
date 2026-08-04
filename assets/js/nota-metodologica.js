/* ============================================================
   cobweb · nota metodológica em janela
   ============================================================
   A nota fica no HTML como um <aside id="nota-metodologica"> ao fim
   da página, e o link da meta strip aponta para ela por âncora. Este
   script promove a nota a <dialog>: o link passa a abrir a janela em
   vez de rolar a página.

   Sem JavaScript, ou em navegador sem <dialog>, nada se perde — a
   nota continua no fim da página e a âncora continua levando até ela.
   ============================================================ */

(function () {
  'use strict';

  const nota = document.getElementById('nota-metodologica');
  if (!nota) return;

  const gatilhos = document.querySelectorAll('a[href="#nota-metodologica"]');
  if (!gatilhos.length) return;

  const dialogo = document.createElement('dialog');
  if (typeof dialogo.showModal !== 'function') return;

  /* A janela não recebe título próprio: o rótulo "nota metodológica" que
     já existe dentro do bloco cumpre esse papel na tela, e o aria-label
     cumpre para quem navega por leitor de tela. */
  dialogo.className = 'nota-modal';
  dialogo.setAttribute('aria-label', 'Nota metodológica');

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'nota-modal__fechar';
  fechar.setAttribute('aria-label', 'Fechar a nota metodológica');
  fechar.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
    + ' stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  dialogo.appendChild(fechar);
  dialogo.appendChild(nota);
  document.body.appendChild(dialogo);

  gatilhos.forEach(function (gatilho) {
    gatilho.addEventListener('click', function (evento) {
      evento.preventDefault();
      dialogo.showModal();
      document.body.style.overflow = 'hidden';
    });
  });

  fechar.addEventListener('click', function () { dialogo.close(); });

  /* Clique fora fecha. Como o padding da janela é zero, qualquer clique
     cujo alvo seja o próprio <dialog> veio do fundo, não do conteúdo. */
  dialogo.addEventListener('click', function (evento) {
    if (evento.target === dialogo) dialogo.close();
  });

  /* Esc já fecha por conta do navegador; resta devolver a rolagem da
     página, travada enquanto a janela está aberta. */
  dialogo.addEventListener('close', function () {
    document.body.style.removeProperty('overflow');
  });
})();
