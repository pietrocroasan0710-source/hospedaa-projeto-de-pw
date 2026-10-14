$(function () {

  var TODOS = [];            // todos os hotéis do JSON
  var jaMostrados = {};      // ids que já estão na tela (para animar só os novos)
  var TETO = 0;              // maior valor do slider de preço
  var moeda = HotelCard.moeda;

  var params = new URLSearchParams(window.location.search);

  // o que veio da busca da home (fica na URL, depois do "?"; pode estar vazio se a pessoa entrou direto)
  var busca = {
    destino:  params.get('destino')  || '',
    checkin:  params.get('checkin')  || '',
    checkout: params.get('checkout') || '',
    hospedes: parseInt(params.get('hospedes')) || 0
  };
  var noites = calcularNoites(busca.checkin, busca.checkout);

  /* ========== MENU E PAINEL MOBILE (mobile = celular: clicou no ☰ abre, clicou de novo fecha) ========== */
  $('#menuToggle').on('click', function () {
    var aberto = $('#menu').toggleClass('aberto').hasClass('aberto');
    // o botão gira (classe .aberto) e troca o ☰ por ✕ quando o menu abre
    $(this).toggleClass('aberto', aberto).text(aberto ? '✕' : '☰');
  });
  $('#btnFiltros').on('click', function () { $('#painelFiltros').toggleClass('aberto'); });

  /* ========== CARREGAR JSON (pega os hotéis do dados.json, nosso "banco de dados" caseiro) ========== */
  HotelCard.esqueletos($('#listaHoteis'), 6);

  $.getJSON('/static/json/dados.json')
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
        'Confira o caminho json/dados.json e confira se a aplicação Flask está em execução.</p>'
      );
    });

  /* ========== FUNÇÕES AUXILIARES (a caixa de ferramentas que o resto do código usa) ========== */
  function calcularNoites(entrada, saida) {
    if (!entrada || !saida) return 0;
    var dias = (new Date(saida) - new Date(entrada)) / 86400000;
    return dias > 0 ? Math.round(dias) : 0;
  }

  // tira acento e deixa minúsculo: assim "sao paulo" acha "São Paulo" (ninguém é obrigado a saber acentuar)
  function normalizar(txt) {
    return String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function formatarData(iso) {
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // devolve a lista sem repetição (sem isso aparecia "SP" cinco vezes)
  function unicos(lista) {
    var saida = [];
    $.each(lista, function (i, v) { if ($.inArray(v, saida) === -1) saida.push(v); });
    return saida.sort();
  }

  /* ========== RESUMO DA BUSCA (mostra os chips com o que veio da home: destino, datas, noites, hóspedes) ========== */
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

  /* ========== CRIAR OS FILTROS (as opções nascem dos dados: colocou hotel novo no JSON, o filtro se atualiza sozinho, mágica!) ========== */
  function prepararFiltros() {
    // preço: o slider vai até o hotel mais caro, arredondado (pra não ficar número quebrado feio)
    var maior = Math.max.apply(null, TODOS.map(function (h) { return h.preco; }));
    TETO = Math.ceil(maior / 50) * 50;
    $('#filtroPreco').attr({ min: 0, max: TETO }).val(TETO);
    $('#valorPreco').text(moeda(TETO));

    // estados (só os que existem no JSON)
    $.each(unicos(TODOS.map(function (h) { return h.estado; })), function (i, uf) {
      $('<option></option>').val(uf).text(uf).appendTo('#filtroEstado');
    });

    // tipos de hospedagem (hotel, pousada, resort...)
    $.each(unicos(TODOS.map(function (h) { return h.tipo; })), function (i, t) {
      $('<label></label>')
        .append($('<input type="checkbox" class="chk-tipo">').val(t))
        .append(document.createTextNode(t))
        .appendTo('#filtroTipos');
    });

    // comodidades: junta as de todos os hotéis e tira as repetidas
    var todas = [];
    $.each(TODOS, function (i, h) { todas = todas.concat(h.comodidades); });
    $.each(unicos(todas), function (i, c) {
      $('<label></label>')
        .append($('<input type="checkbox" class="chk-comodidade">').val(c))
        .append(document.createTextNode(c))
        .appendTo('#filtroComodidades');
    });

    // já escreve aqui o destino digitado na home, pra pessoa não digitar de novo
    $('#filtroTexto').val(busca.destino);
  }

  /* ========== EVENTOS DOS FILTROS (mexeu em qualquer filtro? a lista atualiza na hora) ========== */
  $('#filtroTexto').on('input', aplicarFiltros);
  $('#filtroPreco').on('input', function () {
    $('#valorPreco').text(moeda(Number($(this).val())));
    aplicarFiltros();
  });
  $('#filtroEstado, #filtroNota, #ordenar').on('change', aplicarFiltros);
  // checkbox = caixinha de marcar. Escutar o painel todo funciona até pras caixinhas que o JS criou depois
  $('#painelFiltros').on('change', 'input[type="checkbox"], input[type="radio"]', aplicarFiltros);

  $('#limparFiltros').on('click', function () { limparFiltros(); aplicarFiltros(); });

  // favoritou com o filtro "só favoritos" ligado? a lista atualiza na hora
  $(document).on('favoritos:mudou', function () {
    if ($('#fFav').is(':checked')) { aplicarFiltros(); }
  });

  function limparFiltros() {
    $('#filtroTexto').val('');
    $('#filtroEstado').val('');
    $('#filtroNota').val('0');
    $('#ordenar').val('relevancia');
    $('.chk-tipo, .chk-comodidade, #fCancel, #fPets, #fFav').prop('checked', false);
    $('input[name="estrelas"][value="0"]').prop('checked', true);
    $('#filtroPreco').val(TETO);
    $('#valorPreco').text(moeda(TETO));
  }

  // tira uma "foto" de como estão todos os filtros agora
  function lerFiltros() {
    return {
      textoOriginal: $.trim($('#filtroTexto').val()),
      texto:       normalizar($.trim($('#filtroTexto').val())),
      estado:      $('#filtroEstado').val(),
      tipos:       $('.chk-tipo:checked').map(function () { return this.value; }).get(),
      estrelas:    Number($('input[name="estrelas"]:checked').val()) || 0,
      precoMax:    Number($('#filtroPreco').val()),
      notaMin:     parseFloat($('#filtroNota').val()),
      comodidades: $('.chk-comodidade:checked').map(function () { return this.value; }).get(),
      cancelamento: $('#fCancel').is(':checked'),
      pets:        $('#fPets').is(':checked'),
      favoritos:   $('#fFav').is(':checked')
    };
  }

  /* ========== APLICAR FILTROS (aqui que o bicho pega! o hotel precisa passar em TODOS os testes pra continuar na lista) ========== */
  function aplicarFiltros() {
    var f = lerFiltros();
    var favs = HotelCard.lerFavoritos();

    var resultado = $.grep(TODOS, function (h) {
      var alvo = normalizar(h.nome + ' ' + h.cidade + ' ' + h.estado + ' ' + h.tipo);

      if (f.texto && alvo.indexOf(f.texto) === -1) return false;
      if (f.estado && h.estado !== f.estado) return false;
      if (f.tipos.length && $.inArray(h.tipo, f.tipos) === -1) return false;
      if ((h.estrelas || 0) < f.estrelas) return false;
      if (h.preco > f.precoMax) return false;
      if (h.nota < f.notaMin) return false;
      if (busca.hospedes && h.capacidade && h.capacidade < busca.hospedes) return false;
      if (f.cancelamento && !h.cancelamentoGratis) return false;
      if (f.pets && !h.pets) return false;
      if (f.favoritos && $.inArray(h.id, favs) === -1) return false;

      // precisa ter TODAS as comodidades marcadas (marcou Wi-Fi e Piscina? um dos dois só não vale)
      for (var i = 0; i < f.comodidades.length; i++) {
        if ($.inArray(f.comodidades[i], h.comodidades) === -1) return false;
      }
      return true;
    });

    var ordem = $('#ordenar').val();
    if (ordem === 'preco-asc')  resultado.sort(function (a, b) { return a.preco - b.preco; });
    if (ordem === 'preco-desc') resultado.sort(function (a, b) { return b.preco - a.preco; });
    if (ordem === 'nota')       resultado.sort(function (a, b) { return b.nota - a.nota; });

    atualizarChips(f);
    mostrarHoteis(resultado);
  }

  /* ========== CHIPS DE FILTROS ATIVOS (as etiquetinhas com × em cima da lista: clicou, o filtro some) ========== */
  function atualizarChips(f) {
    var lista = [];
    function add(tipo, valor, rotulo) { lista.push({ tipo: tipo, valor: valor, rotulo: rotulo }); }

    if (f.texto)    add('texto', '', '“' + f.textoOriginal + '”');
    if (f.estado)   add('estado', '', 'Estado: ' + f.estado);
    $.each(f.tipos, function (i, t) { add('tipo', t, t); });
    if (f.estrelas) add('estrelas', '', f.estrelas + '★ ou mais');
    if (f.precoMax < TETO) add('preco', '', 'Até ' + moeda(f.precoMax));
    if (f.notaMin > 0) add('nota', '', 'Nota ' + f.notaMin.toString().replace('.', ',') + '+');
    $.each(f.comodidades, function (i, c) { add('comodidade', c, c); });
    if (f.cancelamento) add('cancelamento', '', 'Cancelamento grátis');
    if (f.pets)         add('pets', '', 'Aceita pets');
    if (f.favoritos)    add('favoritos', '', '♥ Favoritos');

    var $box = $('#filtrosAtivos').empty();
    $.each(lista, function (i, c) {
      $('<button type="button" class="chip-ativo"></button>')
        .attr({ 'data-tipo': c.tipo, 'data-valor': c.valor })
        .text(c.rotulo + ' ')
        .append('<b>×</b>')
        .appendTo($box);
    });
    if (lista.length > 1) {
      $('<button type="button" class="chip-ativo limpar-tudo" data-tipo="tudo">Limpar tudo</button>').appendTo($box);
    }

    // o número de filtros ativos aparece no botão do celular
    $('#badgeFiltros').text(lista.length || '');
  }

  // clicou num chip? desliga aquele filtro
  $('#filtrosAtivos').on('click', '.chip-ativo', function () {
    var tipo  = $(this).attr('data-tipo');
    var valor = $(this).attr('data-valor');

    function desmarcar(seletor) {
      $(seletor).filter(function () { return this.value === valor; }).prop('checked', false);
    }

    // switch = vários "se for isso, faz aquilo" juntos
    switch (tipo) {
      case 'texto':        $('#filtroTexto').val(''); break;
      case 'estado':       $('#filtroEstado').val(''); break;
      case 'tipo':         desmarcar('.chk-tipo'); break;
      case 'estrelas':     $('input[name="estrelas"][value="0"]').prop('checked', true); break;
      case 'preco':        $('#filtroPreco').val(TETO); $('#valorPreco').text(moeda(TETO)); break;
      case 'nota':         $('#filtroNota').val('0'); break;
      case 'comodidade':   desmarcar('.chk-comodidade'); break;
      case 'cancelamento': $('#fCancel').prop('checked', false); break;
      case 'pets':         $('#fPets').prop('checked', false); break;
      case 'favoritos':    $('#fFav').prop('checked', false); break;
      case 'tudo':         limparFiltros(); break;
    }
    aplicarFiltros();
  });

  /* ========== MOSTRAR CARDS (desenha os cards na tela, ou avisa que não achou nada) ========== */
  function mostrarHoteis(lista) {
    var $lista = $('#listaHoteis').empty();
    var $contador = $('#contador');

    $contador.text(lista.length === 1 ? '1 hotel encontrado' : lista.length + ' hotéis encontrados');
    // reinicia a animação do contador (truque: ler o offsetWidth força o navegador a "esquecer" a animação anterior)
    $contador.removeClass('pulsar');
    void $contador[0].offsetWidth;
    $contador.addClass('pulsar');

    if (lista.length === 0) {
      jaMostrados = {};
      $lista.html(
        '<div class="vazio"><span>🔎</span>' +
        '<p>Nenhum hotel encontrado com esses filtros.<br>Tente ampliar a busca.</p></div>'
      );
      return;
    }

    // só os hotéis novos ganham animação de entrada, senão a lista inteira pulava a cada clique (tontura)
    var novos = 0;
    $.each(lista, function (i, h) {
      var ehNovo = !jaMostrados[h.id];
      $lista.append(HotelCard.criar(h, {
        indice: ehNovo ? novos : 0,
        classe: ehNovo ? 'entrada' : '',
        noites: noites,
        params: { checkin: busca.checkin, checkout: busca.checkout, hospedes: busca.hospedes }
      }));
      if (ehNovo) novos++;
    });

    jaMostrados = {};
    $.each(lista, function (i, h) { jaMostrados[h.id] = true; });
  }

});
