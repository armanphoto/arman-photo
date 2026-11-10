/* armanphoto.com — gallery pages (portrait / fashion / product / reportage) and portfolio.
   1. Photos fade in when they arrive instead of popping onto the grey tile.
   2. Lightbox: one shared copy for all four sections (category comes from .grid[data-cat],
      the number of photos from the page itself). */
(function(){
  /* ---------- 1. Նկարների մեղմ հայտնվելը ---------- */
  document.querySelectorAll('.grid img, .band img').forEach(img=>{
    if(img.complete && img.naturalWidth) return;          // արդեն բեռնված՝ առանց անիմացիայի
    img.classList.add('pending');
    const done=()=>img.classList.remove('pending');
    img.addEventListener('load', done, {once:true});
    img.addEventListener('error', done, {once:true});
  });

  /* ---------- 2. Lightbox ---------- */
  const grid=document.querySelector('.grid[data-cat]'), lb=document.getElementById('lb');
  if(!grid || !lb) return;
  const CAT=grid.dataset.cat;
  const tiles=[...grid.querySelectorAll('button[data-n]')];
  const TOTAL=tiles.length;
  const im=document.getElementById('lbI'), c=document.getElementById('lbC'), btnX=document.getElementById('lbX');
  const outside=[...document.body.children].filter(el=>el!==lb && el.tagName!=='SCRIPT');
  let cur=1, tok=0, opener=null, pushed=false;
  tiles.forEach(b=>b.setAttribute('aria-haspopup','dialog'));
  const live=document.createElement('p');                     // screen reader-ը կարդում է նոր նկարը
  live.className='sr'; live.setAttribute('aria-live','polite'); lb.appendChild(live);

  const pad=n=>String(n).padStart(2,'0');
  const file=(n,suf)=>'assets/img/'+CAT+'/'+pad(n)+suf+'.webp';
  const thumb=n=>tiles[n-1] ? tiles[n-1].querySelector('img') : null;

  // ինչ չափ է պետք այս էկրանին. -t (1100), -m (1600) կամ ամբողջը (2400)՝ ըստ էկրանի իրական պիքսելների
  function best(n){
    const t=thumb(n), ar=(t&&t.naturalWidth)? t.naturalWidth/t.naturalHeight : .8;
    const boxW=Math.min(innerWidth*.95, innerHeight*.92*ar);          // CSS px
    const need=boxW*(devicePixelRatio||1);                             // իրական պիքսելներ էկրանին
    const w=long=> ar>=1 ? long : long*ar;                             // ֆայլի իրական լայնությունը (երկար կողմից)
    if(need <= w(1100)*1.05) return file(n,'-t');                      // երբեք չձգել
    if(need <= w(1600)*1.05) return file(n,'-m');
    return file(n,'');
  }
  const warm={};
  function preloadOne(k){
    if(k<1||k>TOTAL) return;
    const u=best(k); if(warm[u]) return;
    const i=new Image(); i.src=u; warm[u]=i;
  }
  // հարևան կադրերը նախապես բեռնել, որ թերթելը ակնթարթային լինի
  function preload(n){ preloadOne(n-1); preloadOne(n+1); }

  function show(n){
    cur=((n-1+TOTAL)%TOTAL)+1;
    const t=thumb(cur), want=best(cur), my=++tok, ready=!!(t && t.complete && t.naturalWidth);
    // նախ՝ արդեն բեռնված փոքր նկարը (ակնթարթային), հետո՝ սուր տարբերակը
    if(ready) im.src=t.currentSrc||t.src;
    const pre=new Image();
    pre.onload=()=>{ if(my===tok) im.src=want; };
    pre.src=want;
    if(!ready) im.src=want;
    im.alt=(t && t.alt) || 'Photograph';
    c.textContent=pad(cur)+' / '+pad(TOTAL);
    lb.classList.toggle('first', cur===1);
    lb.classList.toggle('last',  cur===TOTAL);
    preload(cur);
    if(lb.classList.contains('open')) live.textContent=im.alt+'. '+cur+' of '+TOTAL;
  }

  // էջը չի «ցատկում», երբ scrollbar-ը անհետանում է
  function lockScroll(on){
    const b=document.body;
    if(on){
      const sb=innerWidth-document.documentElement.clientWidth;
      b.style.overflow='hidden';
      if(sb>0) b.style.paddingRight=sb+'px';
    }else{
      b.style.overflow=''; b.style.paddingRight='';
    }
  }

  function open(n, from){
    opener=from||document.activeElement;
    show(n);
    lb.classList.add('open');
    lockScroll(true);
    outside.forEach(el=>{ el.inert=true; });
    btnX.focus({preventScroll:true});
    // հեռախոսի «Հետ» կոճակը փակում է դիտումը, ոչ թե էջը
    try{ history.pushState({lb:1}, ''); pushed=true; }catch(e){ pushed=false; }
  }
  function close(fromHistory){
    if(!lb.classList.contains('open')) return;
    lb.classList.remove('open');
    lockScroll(false);
    outside.forEach(el=>{ el.inert=false; });
    const back=tiles[cur-1] || opener;          // վերադարձնել ֆոկուսը այն նկարին, որին հասել ենք
    if(back) back.focus({preventScroll:true});
    // էջը պտտել մինչև այդ նկարը՝ history.back()-ից հետո (այն վերականգնում է նախկին դիրքը)
    const reveal=()=>{ if(back) back.scrollIntoView({block:'nearest'}); };
    if(pushed && !fromHistory){ pushed=false; ignorePop=true; afterPop=reveal; history.back(); } else { pushed=false; reveal(); }
  }
  let ignorePop=false, afterPop=null;
  addEventListener('popstate', ()=>{
    if(ignorePop){ ignorePop=false; const f=afterPop; afterPop=null; if(f) requestAnimationFrame(f); return; }   // մեր իսկ history.back()-ը
    close(true);
  });

  tiles.forEach(b=>{
    b.addEventListener('pointerdown', ()=>preloadOne(+b.dataset.n));
    b.addEventListener('click', ()=>open(+b.dataset.n, b));
  });
  btnX.onclick=()=>close();
  document.getElementById('lbP').onclick=e=>{ e.stopPropagation(); show(cur-1); };
  document.getElementById('lbN').onclick=e=>{ e.stopPropagation(); show(cur+1); };
  lb.addEventListener('click', e=>{ if(e.target===lb) close(); });

  document.addEventListener('keydown', e=>{
    if(!lb.classList.contains('open')) return;
    if(e.key==='Escape')      close();
    if(e.key==='ArrowLeft')   show(cur-1);
    if(e.key==='ArrowRight')  show(cur+1);
  });

  // մատով թերթել հեռախոսին. հեռավորություն կամ արագ «flick»
  let x0=null, y0=null, t0=0;
  lb.addEventListener('touchstart', e=>{
    x0=e.changedTouches[0].clientX; y0=e.changedTouches[0].clientY; t0=performance.now();
  }, {passive:true});
  lb.addEventListener('touchend', e=>{
    if(x0===null) return;
    const dx=e.changedTouches[0].clientX-x0, dy=e.changedTouches[0].clientY-y0;
    const dt=Math.max(1, performance.now()-t0), ax=Math.abs(dx), ay=Math.abs(dy);
    if(ax>ay && (ax>45 || (ax>20 && ax/dt>0.11)))      show(cur + (dx<0 ? 1 : -1));
    else if(ay>ax && dy>0 && (dy>90 || (dy>30 && dy/dt>0.11))) close();   // ներքև՝ փակում է
    x0=y0=null;
  }, {passive:true});
})();
