/* ==========================================================
   cards.js — funções compartilhadas pelos cards de hotel
   (usado na home e na hoteis.html)
   ========================================================== */
var HotelCard = (function () {

  var CHAVE = 'hospedae_favoritos';

  function moeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /* ---------- Favoritos (guardados no localStorage) ---------- */
  function lerFavoritos() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || []; }
    catch (e) { return []; }
  }

  function salvarFavoritos(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); }
    catch (e) { /* sem localStorage, segue sem salvar */ }
  }

  // devolve true se o hotel passou a ser favorito, false se deixou de ser
  function alternarFavorito(id) {
    var lista = lerFavoritos();
    var pos = $.inArray(id, lista);
    if (pos === -1) { lista.push(id); } else { lista.splice(pos, 1); }
    salvarFavoritos(lista);
    return pos === -1;
  }

  // clique no coração (vale para todos os cards, inclusive os criados depois)
  $(document).on('click', '.btn-fav', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var id = Number($(this).attr('data-id'));
    var agoraFavorito = alternarFavorito(id);
    var $btn = $(this);

    $btn.toggleClass('ativo', agoraFavorito).text(agoraFavorito ? '♥' : '♡');
    $btn.addClass('pop');
    setTimeout(function () { $btn.removeClass('pop'); }, 450);

    $(document).trigger('favoritos:mudou', [id, agoraFavorito]);
  });

  /* ---------- Monta o HTML de um card ----------
     opcoes: { indice, noites, params, classe } */
  function criar(h, opcoes) {
    opcoes = opcoes || {};
    var indice = opcoes.indice || 0;
    var noites = opcoes.noites || 0;

    // parâmetros que vão para hotel.html (ignora os vazios)
    var dados = { id: h.id };
    $.each(opcoes.params || {}, function (k, v) { if (v) { dados[k] = v; } });
    var link = 'hotel.html?' + $.param(dados);

    var tags = $.map(h.comodidades, function (c) { return '<span>' + c + '</span>'; }).join('');

    var selos = '';
    if (h.cancelamentoGratis) { selos += '<span class="selo">Cancelamento grátis</span>'; }
    if (h.pets) { selos += '<span class="selo">🐾 Aceita pets</span>'; }

    var estrelas = new Array((h.estrelas || 0) + 1).join('★');
    var fav = $.inArray(h.id, lerFavoritos()) !== -1;

    var total = noites > 0
      ? '<p class="total-estadia">Total de <strong>' + moeda(h.preco * noites) + '</strong> por ' +
        noites + (noites === 1 ? ' noite' : ' noites') + '</p>'
      : '';

    return '' +
      '<article class="card-hotel ' + (opcoes.classe || '') + '" style="--i:' + indice + '">' +
        '<button type="button" class="btn-fav' + (fav ? ' ativo' : '') + '" data-id="' + h.id +
          '" aria-label="Favoritar">' + (fav ? '♥' : '♡') + '</button>' +
        '<a class="card-link" href="' + link + '">' +
          '<div class="card-img">' +
            '<div class="card-foto" style="background-image:url(\'' + h.imagem + '\')"></div>' +
            '<span class="nota">⭐ ' + h.nota.toFixed(1) + '</span>' +
            (h.tipo ? '<span class="tipo-tag">' + h.tipo + '</span>' : '') +
          '</div>' +
          '<div class="card-corpo">' +
            '<p class="estrelas">' + estrelas + '</p>' +
            '<h3>' + h.nome + '</h3>' +
            '<p class="cidade">' + h.cidade + ' - ' + h.estado + '</p>' +
            (selos ? '<div class="selos">' + selos + '</div>' : '') +
            '<div class="comodidades">' + tags + '</div>' +
            '<p class="preco">' + moeda(h.preco) + ' <small>/ noite</small></p>' +
            total +
          '</div>' +
        '</a>' +
      '</article>';
  }

  /* ---------- Cards "esqueleto" enquanto o JSON carrega ---------- */
  function esqueletos($lista, quantidade) {
    $lista.empty();
    for (var i = 0; i < quantidade; i++) {
      $lista.append('<div class="esqueleto"></div>');
    }
  }

  return {
    moeda: moeda,
    lerFavoritos: lerFavoritos,
    criar: criar,
    esqueletos: esqueletos
  };

})();
