$(function () {

  /* ===================== MENU MOBILE ===================== */
  $('#menuToggle').on('click', function () {
    $('#menu').toggleClass('aberto');
  });

  /* ===================== CARREGAR DADOS (JSON) ===================== */
  HotelCard.esqueletos($('#listaHoteis'), 4);   // placeholders enquanto carrega

  $.getJSON('json/dados.json')
    .done(function (dados) {
      iniciarSlideshow(dados.paisagens);
      mostrarDestaques(dados.hoteis);
    })
    .fail(function () {
      $('#listaHoteis').html(
        '<p class="erro">Não foi possível carregar os dados. ' +
        'Confira o caminho json/dados.json e use o Live Server.</p>'
      );
    });

  /* ===================== SLIDESHOW DE PAISAGENS ===================== */
  function iniciarSlideshow(paisagens) {
    var $box = $('#slideshow');
    var atual = 0;
    var TEMPO = 8000; // ms entre uma paisagem e outra

    $.each(paisagens, function (i, p) {
      $('<div class="slide"></div>')
        .css('background-image', 'url("' + p.url + '")')
        .appendTo($box);
    });

    var $slides = $box.find('.slide');

    function mostrar(i) {
      var $anterior = $slides.filter('.ativo');
      $anterior.removeClass('ativo').addClass('saindo');
      setTimeout(function () { $anterior.removeClass('saindo'); }, 2400);

      $slides.eq(i).addClass('ativo');

      $('#legenda').css('opacity', 0);
      setTimeout(function () {
        $('#legenda').text('📍 ' + paisagens[i].local).css('opacity', 1);
      }, 600);
    }

    mostrar(0);
    setInterval(function () {
      atual = (atual + 1) % paisagens.length;
      mostrar(atual);
    }, TEMPO);
  }

  /* ===================== HOTÉIS EM DESTAQUE ===================== */
  // mostra os 4 hotéis com a melhor nota
  function mostrarDestaques(hoteis) {
    var melhores = hoteis.slice().sort(function (a, b) { return b.nota - a.nota; }).slice(0, 4);
    var $lista = $('#listaHoteis').empty();

    $.each(melhores, function (i, h) {
      $lista.append(HotelCard.criar(h, { indice: i, classe: 'reveal' }));
    });

    Animacoes.revelar();   // ativa a animação "aparecer ao rolar" nos cards novos
  }

  /* ===================== FORMULÁRIO DE BUSCA ===================== */
  var hoje = new Date().toISOString().split('T')[0];
  $('#checkin').attr('min', hoje);
  $('#checkout').attr('min', hoje);

  $('#checkin').on('change', function () {
    $('#checkout').attr('min', $(this).val());
    if ($('#checkout').val() && $('#checkout').val() <= $(this).val()) {
      $('#checkout').val('');
    }
  });

  // tira o vermelho do campo quando a pessoa começa a corrigir
  $('#destino, #checkin, #checkout').on('input change', function () {
    $(this).removeClass('invalido');
  });

  function falhar(mensagem) {
    var $form = $('#formBusca');
    $('#erroBusca').text(mensagem);
    $form.removeClass('tremer');
    void $form[0].offsetWidth;        // reinicia a animação
    $form.addClass('tremer');
  }

  $('#formBusca').on('submit', function (e) {
    e.preventDefault();

    var destino  = $.trim($('#destino').val());
    var checkin  = $('#checkin').val();
    var checkout = $('#checkout').val();
    var hospedes = $('#hospedes').val();

    $('#destino, #checkin, #checkout').removeClass('invalido');

    if (!destino || !checkin || !checkout) {
      if (!destino)  { $('#destino').addClass('invalido'); }
      if (!checkin)  { $('#checkin').addClass('invalido'); }
      if (!checkout) { $('#checkout').addClass('invalido'); }
      falhar('Preencha o destino e as datas para continuar.');
      return;
    }
    if (checkout <= checkin) {
      $('#checkout').addClass('invalido');
      falhar('A data de saída precisa ser depois da entrada.');
      return;
    }
    $('#erroBusca').text('');

    window.location.href = 'hoteis.html?' + $.param({
      destino: destino, checkin: checkin, checkout: checkout, hospedes: hospedes
    });
  });

});
