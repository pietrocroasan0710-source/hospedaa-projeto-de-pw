$(function () {

  /* ========== MENU MOBILE (o ☰ que aparece quando a tela é pequena) ========== */
  $('#menuToggle').on('click', function () {
    $('#menu').toggleClass('aberto');
  });

  /* ========== CARREGAR DADOS (JSON = arquivo de texto com os dados, tipo uma planilha escrita à mão; precisa do Live Server, senão o navegador não deixa ler) ========== */
  HotelCard.esqueletos($('#listaHoteis'), 4);   // esqueletos (retângulos cinza) enquanto carrega

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

  /* ========== SLIDESHOW DE PAISAGENS (o fundo que troca de foto sozinho, tipo protetor de tela de TV) ========== */
  function iniciarSlideshow(paisagens) {
    var $box = $('#slideshow');
    var atual = 0;
    var TEMPO = 8000; // 8000 ms = 8 segundos entre uma foto e outra (ms = milissegundo, 1000 deles formam 1 segundo)

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

  /* ========== HOTÉIS EM DESTAQUE (o "top 4": os hotéis com a melhor nota) ========== */
  // pega os 4 melhores: copia a lista (slice), ordena pela nota e corta em 4. A cópia é pra não bagunçar a original
  function mostrarDestaques(hoteis) {
    var melhores = hoteis.slice().sort(function (a, b) { return b.nota - a.nota; }).slice(0, 4);
    var $lista = $('#listaHoteis').empty();

    $.each(melhores, function (i, h) {
      $lista.append(HotelCard.criar(h, { indice: i, classe: 'reveal' }));
    });

    Animacoes.revelar();   // avisa o animacoes.js que tem card novo pra animar
  }

  /* ========== FORMULÁRIO DE BUSCA (valida o que a pessoa digitou antes de mandar pra próxima página, tipo segurança de balada) ========== */
  var hoje = new Date().toISOString().split('T')[0];
  $('#checkin').attr('min', hoje);
  $('#checkout').attr('min', hoje);

  $('#checkin').on('change', function () {
    $('#checkout').attr('min', $(this).val());
    if ($('#checkout').val() && $('#checkout').val() <= $(this).val()) {
      $('#checkout').val('');
    }
  });

  // a pessoa começou a corrigir? o campo para de ficar vermelho (a gente não é carrasco)
  $('#destino, #checkin, #checkout').on('input change', function () {
    $(this).removeClass('invalido');
  });

  function falhar(mensagem) {
    var $form = $('#formBusca');
    $('#erroBusca').text(mensagem);
    $form.removeClass('tremer');
    void $form[0].offsetWidth;        // truque pra reiniciar a animação da tremida
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
