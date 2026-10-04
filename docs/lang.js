// Sem âncora na URL: rola até o idioma do navegador (pt / en / es). Marca o idioma atual no menu.
(function () {
  var ids = ['pt', 'en', 'es'];
  var hash = location.hash.replace('#', '');
  if (ids.indexOf(hash) < 0) {
    var l = (navigator.language || 'en').toLowerCase();
    hash = l.indexOf('pt') === 0 ? 'pt' : l.indexOf('es') === 0 ? 'es' : 'en';
    if (hash !== 'pt') {
      var el = document.getElementById(hash);
      if (el) el.scrollIntoView();
    }
  }
  var links = document.querySelectorAll('nav a');
  for (var i = 0; i < links.length; i++) {
    if (links[i].getAttribute('href') === '#' + hash) links[i].className = 'current';
  }
})();
