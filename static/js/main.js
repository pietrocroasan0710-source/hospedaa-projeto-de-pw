/* Mundo Aberto: reaproveita o conceito de slideshow do projeto original. */
(function () {
  const menuToggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');
  if (menuToggle && menu) {
    menuToggle.addEventListener('click', function () {
      const aberto = menu.classList.toggle('menu-aberto');
      menuToggle.setAttribute('aria-expanded', String(aberto));
      menuToggle.textContent = aberto ? '×' : '☰';
    });
  }

  const slideshow = document.getElementById('slideshow');
  if (slideshow) {
    let paisagens = [];
    try { paisagens = JSON.parse(slideshow.dataset.paisagens || '[]'); } catch (_) { paisagens = []; }
    if (paisagens.length) {
      let atual = 0;
      function trocarPaisagem() {
        const paisagem = paisagens[atual];
        slideshow.style.backgroundImage = 'url("' + paisagem.url + '")';
        slideshow.classList.remove('slide-enter');
        void slideshow.offsetWidth;
        slideshow.classList.add('slide-enter');
        const legenda = document.getElementById('legenda');
        if (legenda) legenda.textContent = '✦ ' + (paisagem.local || 'PAISAGENS PELO MUNDO').toUpperCase();
        atual = (atual + 1) % paisagens.length;
      }
      trocarPaisagem();
      window.setInterval(trocarPaisagem, 6000);
    }
  }
})();
