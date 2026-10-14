$(function () {

  var TODOS = [];                       // todos os hotéis do JSON
  var params = new URLSearchParams(window.location.search);

  // dados que vieram da busca da home (podem estar vazios)
  var busca = {
    destino:  params.get('destino')  || '',
    checkin:  params.get('checkin')  || '',
    checkout: params.get('checkout') || '',
    hospedes: parseInt(params.get('hospedes')) || 0
  };
  var noites = calcularNoites(busca.checkin, busca.checkout);

  /* ===================== MENU MOBILE ===================== */
  $('#menuToggle').on('click', function () { $('#menu').toggleClass('aberto'); });

  /* ===================== CARREGAR JSON ===================== */
  $.getJSON('json/dados.json')
    .done(function (dados) {
      TODOS = dados.hoteis;
      mostrarResumo();
      prepararFiltros();
      aplicarFiltros();
    })
    .fail(function () {
      $('#contador').text('');
      $('#listaHoteis').html(
        '<p class="vazio">Não foi possível carregar os hotéis. ' +
        'Confira o caminho json/dados.json e use o Live Server.</p>'
      );
    });

  /* ===================== FUNÇÕES AUXILIARES ===================== */
  function calcularNoites(entrada, saida) {
    if (!entrada || !saida) return 0;
    var dias = (new Date(saida) - new Date(entrada)) / 86400000;
    return dias > 0 ? Math.round(dias) : 0;
  }

  // tira acentos e põe em minúsculo, para "sao paulo" achar "São Paulo"
  function normalizar(txt) {
    return String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function moeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatarData(iso) {
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  /* ===================== RESUMO DA BUSCA ===================== */
  function mostrarResumo() {
    var $chips = $('#chipsBusca');
    function chip(texto) { $('<span></span>').text(texto).appendTo($chips); }

    if (busca.destino) chip('📍 ' + busca.destino);
    if (noites > 0) {
      chip('📅 ' + formatarData(busca.checkin) + ' → ' + formatarData(busca.checkout));
      chip('🌙 ' + noites + (noites === 1 ? ' noite' : ' noites'));
    }
    if (busca.hospedes) chip('👥 ' + busca.hospedes + (busca.hospedes === 1 ? ' hóspede' : ' hóspedes'));
    if (!$chips.children().length) chip('Mostrando todos os hotéis');
  }

  /* ===================== FILTROS ===================== */
  function prepararFiltros() {
    // preço: vai até o valor do hotel mais caro (arredondado)
    var maior = Math.max.apply(null, TODOS.map(function (h) { return h.preco; }));
    var teto = Math.ceil(maior / 50) * 50;
    $('#filtroPreco').attr({ min: 0, max: teto }).val(teto);
    $('#valorPreco').text(moeda(teto));

    // comodidades: pega todas as que existem no JSON, sem repetir
    var todas = [];
    $.each(TODOS, function (i, h) {
      $.each(h.comodidades, function (j, c) {
        if ($.inArray(c, todas) === -1) todas.push(c);
      });
    });
    todas.sort();
    $.each(todas, function (i, c) {
      $('<label></label>')
        .append($('<input type="checkbox" class="chk-comodidade">').val(c))
        .append(document.createTextNode(c))
        .appendTo('#filtroComodidades');
    });

    // preenche o campo de texto com o destino digitado na home
    $('#filtroTexto').val(busca.destino);
  }

  // qualquer mudança nos filtros refaz a lista
  $('#filtroTexto').on('input', aplicarFiltros);
  $('#filtroPreco').on('input', function () {
    $('#valorPreco').text(moeda(Number($(this).val())));
    aplicarFiltros();
  });
  $('#filtroNota, #ordenar').on('change', aplicarFiltros);
  $('#filtroComodidades').on('change', '.chk-comodidade', aplicarFiltros);

  $('#limparFiltros').on('click', function () {
    $('#filtroTexto').val('');
    $('#filtroPreco').val($('#filtroPreco').attr('max'));
    $('#valorPreco').text(moeda(Number($('#filtroPreco').attr('max'))));
    $('#filtroNota').val('0');
    $('#ordenar').val('relevancia');
    $('.chk-comodidade').prop('checked', false);
    aplicarFiltros();
  });

  function aplicarFiltros() {
    var texto   = normalizar($.trim($('#filtroTexto').val()));
    var precoMax = Number($('#filtroPreco').val());
    var notaMin  = parseFloat($('#filtroNota').val());
    var marcadas = $('.chk-comodidade:checked').map(function () { return this.value; }).get();

    var resultado = $.grep(TODOS, function (h) {
      var alvo = normalizar(h.nome + ' ' + h.cidade + ' ' + h.estado);

      if (texto && alvo.indexOf(texto) === -1) return false;
      if (h.preco > precoMax) return false;
      if (h.nota < notaMin) return false;
      if (busca.hospedes && h.capacidade && h.capacidade < busca.hospedes) return false;

      // o hotel precisa ter TODAS as comodidades marcadas
      for (var i = 0; i < marcadas.length; i++) {
        if ($.inArray(marcadas[i], h.comodidades) === -1) return false;
      }
      return true;
    });

    // ordenação
    var ordem = $('#ordenar').val();
    if (ordem === 'preco-asc')  resultado.sort(function (a, b) { return a.preco - b.preco; });
    if (ordem === 'preco-desc') resultado.sort(function (a, b) { return b.preco - a.preco; });
    if (ordem === 'nota')       resultado.sort(function (a, b) { return b.nota - a.nota; });

    mostrarHoteis(resultado);
  }

  /* ===================== MOSTRAR CARDS ===================== */
  function mostrarHoteis(lista) {
    var $lista = $('#listaHoteis').empty();

    $('#contador').text(
      lista.length === 1 ? '1 hotel encontrado' : lista.length + ' hotéis encontrados'
    );

    if (lista.length === 0) {
      $lista.html(
        '<div class="vazio"><span>🔎</span>' +
        '<p>Nenhum hotel encontrado com esses filtros.<br>Tente ampliar a busca.</p></div>'
      );
      return;
    }

    $.each(lista, function (i, h) {
      var tags = $.map(h.comodidades, function (c) { return '<span>' + c + '</span>'; }).join('');

      // leva as datas e hóspedes junto para a página de detalhes
      var link = 'hotel.html?' + $.param({
        id: h.id, checkin: busca.checkin, checkout: busca.checkout, hospedes: busca.hospedes
      });

      var total = noites > 0
        ? '<p class="total-estadia">Total de <strong>' + moeda(h.preco * noites) +
          '</strong> por ' + noites + (noites === 1 ? ' noite' : ' noites') + '</p>'
        : '';

      $lista.append(
        '<a class="card-hotel" href="' + link + '">' +
          '<div class="card-img" style="background-image:url(\'' + h.imagem + '\')">' +
            '<span class="nota">⭐ ' + h.nota.toFixed(1) + '</span>' +
          '</div>' +
          '<div class="card-corpo">' +
            '<h3>' + h.nome + '</h3>' +
            '<p class="cidade">' + h.cidade + ' - ' + h.estado + '</p>' +
            '<div class="comodidades">' + tags + '</div>' +
            '<p class="preco">' + moeda(h.preco) + ' <small>/ noite</small></p>' +
            total +
          '</div>' +
        '</a>'
      );
    });
  }

});
