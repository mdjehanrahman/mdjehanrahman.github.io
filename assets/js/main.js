/* Md. Jehan Rahman — GIS portfolio scripts (no external libraries) */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s);}, $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s));};
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- noise ---------- */
  function makeNoise(seed){
    var p=[],i; for(i=0;i<256;i++)p[i]=i;
    var s=seed||1; function rnd(){ s=(s*16807)%2147483647; return s/2147483647; }
    for(i=255;i>0;i--){ var j=Math.floor(rnd()*(i+1)); var t=p[i];p[i]=p[j];p[j]=t; }
    var perm=p.concat(p), g=[]; for(i=0;i<256;i++)g[i]=rnd()*2-1;
    function fade(t){return t*t*(3-2*t);}
    function v(x,y){ var X=Math.floor(x)&255,Y=Math.floor(y)&255, xf=x-Math.floor(x), yf=y-Math.floor(y);
      var a=g[perm[X+perm[Y]]], b=g[perm[X+1+perm[Y]]], c=g[perm[X+perm[Y+1]]], d=g[perm[X+1+perm[Y+1]]], u=fade(xf), w=fade(yf);
      return (a+(b-a)*u)+((c+(d-c)*u)-(a+(b-a)*u))*w; }
    return function(x,y,oct){ var t=0,amp=1,f=1,n=0; for(var k=0;k<(oct||5);k++){ t+=v(x*f,y*f)*amp; n+=amp; amp*=.5; f*=2; } return t/n; };
  }

  /* ---------- hypsometric colour ramp ---------- */
  var ramp=[[0,[29,91,143]],[.22,[47,143,131]],[.42,[124,178,106]],[.62,[216,201,138]],[.82,[185,138,90]],[1,[242,239,230]]];
  function colour(h){ h=Math.max(0,Math.min(1,h)); for(var i=1;i<ramp.length;i++){ if(h<=ramp[i][0]){ var a=ramp[i-1],b=ramp[i],t=(h-a[0])/(b[0]-a[0]);
    return [a[1][0]+(b[1][0]-a[1][0])*t,a[1][1]+(b[1][1]-a[1][1])*t,a[1][2]+(b[1][2]-a[1][2])*t]; } } return ramp[5][1]; }

  /* ---------- interactive 3D terrain (home hero) ---------- */
  function Terrain(cv){
    var ctx=cv.getContext('2d'), small=window.innerWidth<700, N=small?44:78, noise=makeNoise(11), H=[], i, j;
    for(j=0;j<=N;j++){ H[j]=[]; for(i=0;i<=N;i++){
      var x=i/N, y=j/N, h=noise(x*2.2+3,y*2.2+1,3)*.9+.5;
      h+=.32*Math.exp(-((x-.62)*(x-.62)+(y-.38)*(y-.38))/.03);           // hill
      var rv=y-(.55+.12*Math.sin(x*7)); h-=.38*Math.exp(-(rv*rv)/.0025);   // river valley
      H[j][i]=h; } }
    var mn=1e9,mx=-1e9; H.forEach(function(r){r.forEach(function(v){mn=Math.min(mn,v);mx=Math.max(mx,v);});});
    H=H.map(function(r){return r.map(function(v){return (v-mn)/(mx-mn);});});
    var pins=[[.62,.38,'Groundwater study'],[.25,.58,'Flood housing'],[.78,.72,'Fire safety'],[.35,.22,'Upazila plan']];
    var yaw=-.7, pitch=.95, auto=true, drag=null, W=0, Hh=0, dpr=Math.min(2,window.devicePixelRatio||1), visible=true, t0=performance.now();
    function size(){ W=cv.clientWidth; Hh=cv.clientHeight; cv.width=W*dpr; cv.height=Hh*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    size(); window.addEventListener('resize',size);
    function proj(x,y,z){
      var cx=x-.5, cy=y-.5, cz=z*.22;
      var c=Math.cos(yaw), s=Math.sin(yaw), X=cx*c-cy*s, Y=cx*s+cy*c;
      var cp=Math.cos(pitch), sp=Math.sin(pitch), Y2=Y*cp-cz*sp, Z2=Y*sp+cz*cp;
      var sc=small?Math.min(W*1.05,Hh*.75):Math.min(W*.47,Hh*.92), d=2.4, f=d/(d+Y2);
      var ox=small?W*.5:W*.7, oy=small?Hh*.74:Hh*.54;
      return [ox+X*sc*f, oy-Z2*sc*f, Y2];
    }
    function frame(now){
      if(!visible){ requestAnimationFrame(frame); return; }
      var dt=Math.min(50,now-t0); t0=now;
      if(auto&&!reduce) yaw+=dt*0.00012;
      ctx.clearRect(0,0,W,Hh);
      var P=[]; for(j=0;j<=N;j++){ P[j]=[]; for(i=0;i<=N;i++) P[j][i]=proj(i/N,j/N,H[j][i]); }
      var q=[]; for(j=0;j<N;j++) for(i=0;i<N;i++){ q.push([ (P[j][i][2]+P[j+1][i+1][2])/2, i, j ]); }
      q.sort(function(a,b){return b[0]-a[0];});
      var lx=Math.cos(yaw+2.3), ly=Math.sin(yaw+2.3);
      for(var k=0;k<q.length;k++){
        i=q[k][1]; j=q[k][2];
        var a=P[j][i], b=P[j][i+1], c=P[j+1][i+1], d=P[j+1][i];
        var h=(H[j][i]+H[j][i+1]+H[j+1][i]+H[j+1][i+1])/4;
        var dx=(H[j][i+1]-H[j][i])*N*.22, dy=(H[j+1][i]-H[j][i])*N*.22;
        var shade=Math.max(.6,Math.min(1.18,1-(dx*lx+dy*ly)*.55));
        var col=colour(h);
        ctx.fillStyle='rgb('+(col[0]*shade|0)+','+(col[1]*shade|0)+','+(col[2]*shade|0)+')';
        ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.lineTo(c[0],c[1]); ctx.lineTo(d[0],d[1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle=ctx.fillStyle; ctx.lineWidth=.6; ctx.stroke();
        if((i%6===0)||(j%6===0)){ ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=.5; ctx.beginPath(); if(i%6===0){ctx.moveTo(a[0],a[1]);ctx.lineTo(d[0],d[1]);} if(j%6===0){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);} ctx.stroke(); }
      }
      // pins
      pins.forEach(function(pn){
        var gi=Math.round(pn[0]*N), gj=Math.round(pn[1]*N), base=proj(pn[0],pn[1],H[gj][gi]), top=proj(pn[0],pn[1],H[gj][gi]+.55);
        ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(base[0],base[1]); ctx.lineTo(top[0],top[1]); ctx.stroke();
        ctx.fillStyle='#e0b65a'; ctx.beginPath(); ctx.arc(top[0],top[1],5,0,7); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(base[0],base[1],2.5,0,7); ctx.fill();
        if(!small){ ctx.font='600 12px Inter,system-ui,sans-serif'; var tw=ctx.measureText(pn[2]).width;
          ctx.fillStyle='rgba(11,22,38,.78)'; ctx.fillRect(top[0]+9,top[1]-11,tw+14,22);
          ctx.fillStyle='#e6eef6'; ctx.fillText(pn[2],top[0]+16,top[1]+4); }
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    function down(x,y){ drag=[x,y,yaw,pitch]; auto=false; }
    function move(x,y){ if(!drag)return; yaw=drag[2]+(x-drag[0])*.008; pitch=Math.max(.45,Math.min(1.25,drag[3]+(y-drag[1])*.004)); }
    function up(){ drag=null; setTimeout(function(){ if(!drag) auto=true; },2500); }
    cv.addEventListener('mousedown',function(e){down(e.clientX,e.clientY);});
    window.addEventListener('mousemove',function(e){move(e.clientX,e.clientY);});
    window.addEventListener('mouseup',up);
    cv.addEventListener('touchstart',function(e){ var t=e.touches[0]; down(t.clientX,t.clientY); },{passive:true});
    cv.addEventListener('touchmove',function(e){ var t=e.touches[0]; if(drag&&Math.abs(t.clientX-drag[0])>Math.abs(t.clientY-drag[1])) move(t.clientX,drag[1]); },{passive:true});
    cv.addEventListener('touchend',up);
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible=es[0].isIntersecting; }).observe(cv);
  }

  /* ---------- animated topographic contours (banners, CTA) ---------- */
  function Contours(cv,opt){
    opt=opt||{}; var ctx=cv.getContext('2d'), noise=makeNoise(opt.seed||5), dpr=Math.min(2,window.devicePixelRatio||1), W,H,t=0, visible=true;
    function size(){ W=cv.clientWidth; H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); draw(); }
    var step=18;
    function draw(){
      ctx.clearRect(0,0,W,H);
      var cols=Math.ceil(W/step)+1, rows=Math.ceil(H/step)+1, F=[], x, y;
      for(y=0;y<rows;y++){ F[y]=[]; for(x=0;x<cols;x++) F[y][x]=noise(x*step/420+t, y*step/420-t*.6, 4); }
      for(var L=-.6;L<=.6;L+=.075){
        var major=Math.abs(Math.round(L/.075)%4)===0;
        ctx.strokeStyle=major?(opt.major||'rgba(79,209,197,.55)'):(opt.minor||'rgba(160,190,215,.22)');
        ctx.lineWidth=major?1.1:.7; ctx.beginPath();
        for(y=0;y<rows-1;y++) for(x=0;x<cols-1;x++){
          var a=F[y][x],b=F[y][x+1],c=F[y+1][x+1],d=F[y+1][x], idx=(a>L?8:0)|(b>L?4:0)|(c>L?2:0)|(d>L?1:0);
          if(idx===0||idx===15) continue;
          var px=x*step, py=y*step;
          var e=[[px+step*(L-a)/(b-a),py],[px+step,py+step*(L-b)/(c-b)],[px+step*(L-d)/(c-d),py+step],[px,py+step*(L-a)/(d-a)]];
          var segs={1:[[2,3]],2:[[1,2]],3:[[1,3]],4:[[0,1]],5:[[0,3],[1,2]],6:[[0,2]],7:[[0,3]],8:[[0,3]],9:[[0,2]],10:[[0,1],[2,3]],11:[[0,1]],12:[[1,3]],13:[[1,2]],14:[[2,3]]}[idx];
          segs.forEach(function(s){ ctx.moveTo(e[s[0]][0],e[s[0]][1]); ctx.lineTo(e[s[1]][0],e[s[1]][1]); });
        }
        ctx.stroke();
      }
    }
    size(); window.addEventListener('resize',size);
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible=es[0].isIntersecting; }).observe(cv);
    if(!reduce){ var last=0; (function loop(now){ if(visible&&now-last>60){ t+=.0016; draw(); last=now; } requestAnimationFrame(loop); })(0); }
  }

  /* ---------- radar chart ---------- */
  function Radar(el){
    var data=JSON.parse(el.getAttribute('data-radar')), n=data.length, S=360, c=S/2, R=120, svg='';
    function pt(i,r){ var a=-Math.PI/2+i*2*Math.PI/n; return [c+r*Math.cos(a), c+r*Math.sin(a)]; }
    for(var g=1;g<=4;g++){ var poly=[]; for(var i=0;i<n;i++) poly.push(pt(i,R*g/4).join(','));
      svg+='<polygon points="'+poly.join(' ')+'" fill="'+(g%2?'#f3f6fa':'#fff')+'" stroke="#dfe6ee"/>'; }
    for(i=0;i<n;i++){ var e=pt(i,R); svg+='<line x1="'+c+'" y1="'+c+'" x2="'+e[0]+'" y2="'+e[1]+'" stroke="#dfe6ee"/>';
      var l=pt(i,R+26); svg+='<text x="'+l[0]+'" y="'+(l[1]+4)+'" text-anchor="middle">'+data[i][0]+'</text>'; }
    var pts=[]; for(i=0;i<n;i++) pts.push(pt(i,R*data[i][1]/100).join(','));
    svg+='<polygon class="rp" points="'+pts.join(' ')+'" fill="rgba(20,160,148,.22)" stroke="#14a094" stroke-width="2.2" style="transform-origin:'+c+'px '+c+'px;transform:scale(0);transition:transform 1.2s cubic-bezier(.3,1.3,.5,1)"/>';
    for(i=0;i<n;i++){ var p=pt(i,R*data[i][1]/100); svg+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#14a094"/>'; }
    el.innerHTML='<svg class="radar" viewBox="-30 -10 '+(S+60)+' '+(S+20)+'" width="100%" style="max-width:440px" role="img" aria-label="Skill profile chart">'+svg+'</svg>';
    onSee(el,function(){ var p=el.querySelector('.rp'); if(p) p.style.transform='scale(1)'; });
  }

  /* ---------- donut chart ---------- */
  function Donut(el){
    var data=JSON.parse(el.getAttribute('data-donut')), tot=data.reduce(function(s,d){return s+d[1];},0), r=70, C=2*Math.PI*r, off=0, svg='', leg='';
    data.forEach(function(d){ var len=C*d[1]/tot;
      svg+='<circle r="'+r+'" cx="100" cy="100" fill="none" stroke="'+d[2]+'" stroke-width="26" stroke-dasharray="0 '+C+'" data-len="'+len+'" stroke-dashoffset="'+(-off)+'" style="transition:stroke-dasharray 1.2s ease" transform="rotate(-90 100 100)"/>';
      off+=len; leg+='<div><span style="background:'+d[2]+'"></span>'+d[0]+' <b>'+d[1]+'</b></div>'; });
    svg+='<text x="100" y="98" text-anchor="middle" style="font:700 34px Space Grotesk,sans-serif;fill:#0b1626">'+tot+'</text><text x="100" y="122" text-anchor="middle" style="font:500 12px Inter,sans-serif;fill:#5b6778">'+(el.getAttribute('data-label')||'total')+'</text>';
    el.innerHTML='<div class="donut-wrap"><svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Chart">'+svg+'</svg><div class="donut-legend">'+leg+'</div></div>';
    onSee(el,function(){ $$('circle',el).forEach(function(c){ c.setAttribute('stroke-dasharray',c.getAttribute('data-len')+' '+C); }); });
  }

  /* ---------- helpers ---------- */
  function onSee(el,fn){
    if(!('IntersectionObserver' in window)){ fn(); return; }
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ fn(e.target); io.unobserve(e.target); } }); },{threshold:.18});
    io.observe(el);
  }
  function counter(el){
    var end=parseFloat(el.getAttribute('data-count')), dec=(el.getAttribute('data-count').split('.')[1]||'').length, t0=null, dur=1600, suf=el.getAttribute('data-suffix')||'';
    function step(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/dur), e=1-Math.pow(1-p,3); el.firstChild.nodeValue=(end*e).toFixed(dec)+suf; if(p<1) requestAnimationFrame(step); }
    if(!el.firstChild) el.appendChild(document.createTextNode(''));
    reduce ? (el.firstChild.nodeValue=end.toFixed(dec)+suf) : requestAnimationFrame(step);
  }

  document.addEventListener('DOMContentLoaded',function(){
    /* header, menu, progress */
    var head=$('.site-head'), nav=$('.nav'), mb=$('.menu-btn'), prog=$('.progress'), top=$('.totop');
    function onScroll(){ var y=window.scrollY; if(head) head.classList.toggle('solid',y>30);
      if(prog){ var h=document.documentElement.scrollHeight-window.innerHeight; prog.style.width=(h>0?y/h*100:0)+'%'; }
      if(top) top.classList.toggle('show',y>600); }
    window.addEventListener('scroll',onScroll,{passive:true}); onScroll();
    if(mb) mb.addEventListener('click',function(){ nav.classList.toggle('open'); mb.classList.toggle('x'); mb.setAttribute('aria-expanded',nav.classList.contains('open')); });
    if(top) top.addEventListener('click',function(){ window.scrollTo({top:0,behavior:'smooth'}); });
    var page=document.body.getAttribute('data-page'); $$('.nav a[data-p]').forEach(function(a){ if(a.getAttribute('data-p')===page) a.classList.add('active'); });
    var yr=$('#yr'); if(yr) yr.textContent=new Date().getFullYear();

    /* visuals */
    $$('canvas.terrain').forEach(function(c){ Terrain(c); });
    $$('canvas.contours').forEach(function(c){ Contours(c,{seed:+(c.getAttribute('data-seed')||5)}); });
    $$('[data-radar]').forEach(Radar);
    $$('[data-donut]').forEach(Donut);
    $$('.rv').forEach(function(el){ onSee(el,function(){ el.classList.add('in'); }); });
    $$('[data-count]').forEach(function(el){ onSee(el,counter); });
    $$('.fill[data-w]').forEach(function(el){ onSee(el,function(){ el.style.width=el.getAttribute('data-w')+'%'; }); });
    $$('.layers').forEach(function(el){ onSee(el,function(){ setTimeout(function(){ el.classList.add('open'); },250); }); });

    /* filters */
    $$('.filters').forEach(function(f){
      var target=$(f.getAttribute('data-target'));
      $$('button',f).forEach(function(b){ b.addEventListener('click',function(){
        $$('button',f).forEach(function(x){x.classList.remove('on');}); b.classList.add('on');
        var k=b.getAttribute('data-f');
        $$('[data-cat]',target).forEach(function(it){ it.classList.toggle('hide', k!=='all' && it.getAttribute('data-cat').split(' ').indexOf(k)<0); });
      }); });
    });

    /* project modal */
    var modal=$('#modal');
    if(modal){
      $$('.proj').forEach(function(p){
        function open(){ $('.mimg',modal).src=$('img',p).src; $('.mimg',modal).alt=$('h3',p).textContent;
          $('.mk',modal).textContent=p.getAttribute('data-kind'); $('.mt',modal).textContent=$('h3',p).textContent;
          $('.md',modal).innerHTML=$('.detail',p).innerHTML; modal.classList.add('open'); document.body.style.overflow='hidden'; $('.x',modal).focus(); }
        p.addEventListener('click',open); p.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
      });
      function close(){ modal.classList.remove('open'); document.body.style.overflow=''; }
      $('.x',modal).addEventListener('click',close);
      modal.addEventListener('click',function(e){ if(e.target===modal) close(); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
    }

    /* video play / pause */
    $$('.video-card').forEach(function(vc){ var v=$('video',vc), b=$('.vbtn',vc); if(!v||!b) return;
      b.addEventListener('click',function(){ if(v.paused){ v.play(); b.textContent='❚❚'; b.setAttribute('aria-label','Pause video'); } else { v.pause(); b.textContent='▶'; b.setAttribute('aria-label','Play video'); } });
      if(reduce){ v.pause(); v.removeAttribute('autoplay'); b.textContent='▶'; }
    });

    /* copy citation / email */
    $$('[data-copy]').forEach(function(b){ b.addEventListener('click',function(){
      var txt=b.getAttribute('data-copy'), old=b.textContent;
      function ok(){ b.textContent='Copied ✓'; setTimeout(function(){ b.textContent=old; },1600); }
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok,function(){ window.prompt('Copy:',txt); });
      else window.prompt('Copy:',txt);
    }); });

    /* contact form -> opens an email draft */
    var form=$('form.msg');
    if(form) form.addEventListener('submit',function(e){
      e.preventDefault();
      var nm=form.name.value.trim(), em=form.email.value.trim(), tp=form.topic.value, ms=form.message.value.trim();
      var subj=encodeURIComponent('['+tp+'] Message from '+(nm||'website visitor'));
      var body=encodeURIComponent(ms+'\n\n— '+nm+(em?' ('+em+')':''));
      window.open('https://mail.google.com/mail/?view=cm&fs=1&to=jehan2723@gmail.com&su='+subj+'&body='+body,'_blank');
      var note=$('.form-note'); if(note) note.textContent='An email draft has opened in a new tab. If it did not, write to jehan2723@gmail.com.';
    });
  });
})();
