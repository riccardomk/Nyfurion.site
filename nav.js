/* ============================================================
   NYFURION — SHARED NAVBAR behavior
   Wheel -> horizontal scroll, drag/swipe, red progress line,
   auto-center the active link. Works on phone / tablet / desktop.
   ============================================================ */
(function(){
  function init(){
    var sc = document.getElementById('navScroll');
    var prog = document.getElementById('navProg');
    if(!sc) return;
    function updateProg(){
      var max = sc.scrollWidth - sc.clientWidth;
      if(max <= 1){ if(prog){ prog.classList.remove('show'); prog.style.setProperty('--p','0%'); } return; }
      if(prog){ prog.classList.add('show'); prog.style.setProperty('--p', (sc.scrollLeft / max * 100) + '%'); }
    }
    // vertical wheel -> horizontal scroll
    sc.addEventListener('wheel', function(e){
      var max = sc.scrollWidth - sc.clientWidth;
      if(max <= 1) return;
      if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){ sc.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive:false });
    // click-drag to scroll
    var down=false, startX=0, startL=0, moved=false;
    sc.addEventListener('pointerdown', function(e){ down=true; moved=false; startX=e.clientX; startL=sc.scrollLeft; sc.classList.add('grabbing'); });
    sc.addEventListener('pointermove', function(e){ if(!down) return; var dx=e.clientX-startX; if(Math.abs(dx)>4) moved=true; sc.scrollLeft = startL - dx; });
    function endDrag(){ down=false; sc.classList.remove('grabbing'); }
    sc.addEventListener('pointerup', endDrag);
    sc.addEventListener('pointerleave', endDrag);
    // prevent the link click if the user was dragging
    var links = sc.querySelectorAll('a');
    for(var i=0;i<links.length;i++){ links[i].addEventListener('click', function(e){ if(moved){ e.preventDefault(); } }); }
    sc.addEventListener('scroll', updateProg, { passive:true });
    window.addEventListener('resize', updateProg);
    // bring the active item into view, then sync progress
    var act = sc.querySelector('a.active');
    if(act && act.scrollIntoView){ act.scrollIntoView({ inline:'center', block:'nearest' }); }
    updateProg();
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
