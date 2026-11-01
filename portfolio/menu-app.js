/* Ritocchi solo nell'app (il sito vero non si tocca). */
/* La foto aperta a tutto schermo stava spostata a destra sul telefono: la finestra ha 28 px di margine per lato,
   ma la foto poteva allargarsi fino al 95% dello schermo e sbordava. Ora resta dentro, centrata. */
(function () {
  var st = document.createElement('style');
  st.textContent = '.lightbox img{max-width:calc(100vw - 56px);max-height:calc(100vh - 56px)}';
  document.head.appendChild(st);
})();

/* Il menu a tendina spariva scorrendo: dopo 40 px la barra in alto prende una sfocatura
   (backdrop-filter), e un elemento sfocato "chiude" dentro di se' i figli a posizione fissa, quindi il menu aperto
   finiva schiacciato nella barra. Con il menu aperto: niente sfocatura e la pagina sotto non scorre. */
(function () {
  var burger = document.getElementById('burger'), nav = document.getElementById('nav'), links = document.getElementById('navLinks');
  if (!burger || !nav || !links) return;
  var st = document.createElement('style');
  st.textContent = 'nav.top.menu-aperto{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' +
    'html.menu-aperto,html.menu-aperto body{overflow:hidden}';
  document.head.appendChild(st);
  function allinea() {
    var aperto = links.classList.contains('open');
    nav.classList.toggle('menu-aperto', aperto);
    document.documentElement.classList.toggle('menu-aperto', aperto);
  }
  burger.addEventListener('click', function () { setTimeout(allinea, 0); });
  links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setTimeout(allinea, 0); }); });
})();
