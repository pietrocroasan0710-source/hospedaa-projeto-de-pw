$(function () {

  /* ---------- menu para mobile ---------- */
  $('#menuToggle').on('click', function () {
    $('#menu').toggleClass('aberto');
  });

  /* ---------------- carregar os dados do json, eu pensei em guaradr as coisas nele, mas pode mudar se vcs quiserem.*/
  $.getJSON('./json/dados.json')
    .done(function (dados) {
      iniciarSlideshow(dados.paisagens);
      mostrarHoteis(dados.hoteis);
    })
    .fail(function () {
      $('#listaHoteis').html(
        '<p class="erro">Não foi possível carregar os dados. ' +
        'Abra o site com um servidor local (ex.: Live Server do VS Code).</p>'
      );
    });

  /* --------- a parte das paisagens do fundo pq e uma animação --------- */
  function iniciarSlideshow(paisagens) {
    var $box = $('#slideshow');
    var atual = 0;
    var TEMPO = 8000; // milesegundos entre uma paisagem e outra =)

    // cria um <div> para cada paisagem
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

      // troca a legenda com um pequeno fade
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

  /* ---------------- cards -------------------- */
  function mostrarHoteis(hoteis) {
    var $lista = $('#listaHoteis').empty();

    $.each(hoteis, function (i, h) {
      var preco = h.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      var tags = $.map(h.comodidades, function (c) { return '<span>' + c + '</span>'; }).join('');

      $lista.append(
        '<a class="card-hotel" href="hotel.html?id=' + h.id + '">' +
          '<div class="card-img" style="background-image:url(\'' + h.imagem + '\')">' +
            '<span class="nota">⭐ ' + h.nota.toFixed(1) + '</span>' +
          '</div>' +
          '<div class="card-corpo">' +
            '<h3>' + h.nome + '</h3>' +
            '<p class="cidade">' + h.cidade + ' - ' + h.estado + '</p>' +
            '<div class="comodidades">' + tags + '</div>' +
            '<p class="preco">' + preco + ' <small>/ noite</small></p>' +
          '</div>' +
        '</a>'
      );
    });
  }

  /* -------------------- a parte de busca --------------------- */
  var hoje = new Date().toISOString().split('T')[0];
  $('#checkin').attr('min', hoje);
  $('#checkout').attr('min', hoje);

  // a saída não pode ser antes da entrada
  $('#checkin').on('change', function () {
    $('#checkout').attr('min', $(this).val());
    if ($('#checkout').val() && $('#checkout').val() <= $(this).val()) {
      $('#checkout').val('');
    }
  });

  $('#formBusca').on('submit', function (e) {
    e.preventDefault();

    var destino  = $.trim($('#destino').val());
    var checkin  = $('#checkin').val();
    var checkout = $('#checkout').val();
    var hospedes = $('#hospedes').val();
    var $erro    = $('#erroBusca');

    if (!destino || !checkin || !checkout) {
      $erro.text('Preencha o destino e as datas para continuar.');
      return;
    }
    if (checkout <= checkin) {
      $erro.text('A data de saída precisa ser depois da entrada.');
      return;
    }
    $erro.text('');

    // leva os dados para a próxima página (hoteis.html) pela URL (vou fazer ainda a parte de filtrar os hoteis por destino e datas, mas por enquanto só leva os dados) obs: hoteis.html ainda nao existe 
    window.location.href = 'hoteis.html?' + $.param({
      destino: destino, checkin: checkin, checkout: checkout, hospedes: hospedes
    });
  });

});
