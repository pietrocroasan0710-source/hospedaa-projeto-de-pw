/* ========== ANIMAÇÕES (o tempero do site, sem isso fica tudo parado e sem graça) ========== */
// atenção: precisa do jQuery carregado antes, senão dá erro e ninguém merece
$(function () {

  var $janela = $(window);

  /* ========== NAVBAR ENCOLHE + BOTÃO VOLTAR AO TOPO (a navbar emagrece quando você rola, tipo dieta relâmpago) ========== */
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

  /* ========== ROLAGEM SUAVE (clicou em "Destinos"? em vez de teleportar, a tela desliza até lá) ========== */
  $('a[href^="#"]').on('click', function (e) {
    var $alvo = $(this.hash);
    if ($alvo.length) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: $alvo.offset().top - 70 }, 700);
    }
  });

  /* ========== APARECER AO ROLAR (os elementos nascem invisíveis e surgem quando você chega neles, tipo susto do bem) ========== */
  // IntersectionObserver = um "vigia" do navegador que avisa quando um elemento entrou na tela
  var observador = null;

  if ('IntersectionObserver' in window) {
    observador = new IntersectionObserver(function (itens) {
      $.each(itens, function (i, item) {
        if (!item.isIntersecting) { return; }
        var $el = $(item.target);
        $el.addClass('visivel');
        observador.unobserve(item.target);

        // quando a animação acaba, tira a classe: assim o :hover do card não fica com atraso (e atraso irrita)
        setTimeout(function () { $el.removeClass('reveal visivel'); }, 1600);
      });
    }, { threshold: 0.15 });
  }

  // dá pra chamar de novo quando o JS criar cards novos (eles nascem depois que a página carrega)
  function revelar() {
    $('.reveal').each(function () {
      if ($(this).data('observado')) { return; }
      $(this).data('observado', true);
      if (observador) { observador.observe(this); }
      else { $(this).removeClass('reveal'); }
    });
  }
  revelar();

  /* ========== EFEITO DE ONDA NOS BOTÕES (ripple = aquela ondinha de água que nasce onde você clicou) ========== */
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

  // deixa a função "pública" pros outros arquivos usarem (tipo emprestar o caderno)
  window.Animacoes = { revelar: revelar };

});
