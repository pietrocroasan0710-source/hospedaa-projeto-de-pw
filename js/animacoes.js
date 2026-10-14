/* ==========================================================
   animacoes.js — animações compartilhadas por todas as páginas
   (precisa do jQuery carregado antes)
   ========================================================== */
$(function () {

  var $janela = $(window);

  /* ---------- Navbar encolhe e botão "voltar ao topo" ---------- */
  var $topo = $('<button type="button" class="btn-topo" aria-label="Voltar ao topo">↑</button>')
    .appendTo('body')
    .on('click', function () {
      $('html, body').animate({ scrollTop: 0 }, 600);
    });

  function aoRolar() {
    var y = $janela.scrollTop();
    $('.navbar').toggleClass('rolou', y > 30);
    $topo.toggleClass('visivel', y > 500);
  }
  $janela.on('scroll', aoRolar);
  aoRolar();

  /* ---------- Rolagem suave para links internos (#destinos etc.) ---------- */
  $('a[href^="#"]').on('click', function (e) {
    var $alvo = $(this.hash);
    if ($alvo.length) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: $alvo.offset().top - 70 }, 700);
    }
  });

  /* ---------- Aparecer ao rolar (elementos com a classe .reveal) ---------- */
  var observador = null;

  if ('IntersectionObserver' in window) {
    observador = new IntersectionObserver(function (itens) {
      $.each(itens, function (i, item) {
        if (!item.isIntersecting) { return; }
        var $el = $(item.target);
        $el.addClass('visivel');
        observador.unobserve(item.target);

        // depois que a animação termina, devolve o elemento ao CSS normal
        // (assim o :hover do card não fica com atraso)
        setTimeout(function () { $el.removeClass('reveal visivel'); }, 1600);
      });
    }, { threshold: 0.15 });
  }

  // pode ser chamada de novo depois de criar elementos novos
  function revelar() {
    $('.reveal').each(function () {
      if ($(this).data('observado')) { return; }
      $(this).data('observado', true);
      if (observador) { observador.observe(this); }
      else { $(this).removeClass('reveal'); }
    });
  }
  revelar();

  /* ---------- Efeito de onda (ripple) nos botões ---------- */
  $(document).on('click', '.btn-buscar, .btn-entrar, .btn-limpar, .btn-ver-todos', function (e) {
    var $btn = $(this);
    var caixa = this.getBoundingClientRect();
    var tam = Math.max(caixa.width, caixa.height);

    $('<span class="ripple"></span>')
      .css({
        width: tam, height: tam,
        left: e.clientX - caixa.left - tam / 2,
        top: e.clientY - caixa.top - tam / 2
      })
      .appendTo($btn)
      .on('animationend', function () { $(this).remove(); });
  });

  // deixa disponível para os outros scripts
  window.Animacoes = { revelar: revelar };

});
