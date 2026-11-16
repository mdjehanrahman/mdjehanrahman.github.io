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

  /* ---------- interactive 3D city model (light theme) ---------- */
  function City(cv){
    var capture=cv.hasAttribute('data-capture');
    var ctx=cv.getContext('2d'), small=!capture&&window.innerWidth<700, G=small?11:15, noise=makeNoise(23), i, j, k;
    function riverY(x){ return .80+.06*Math.sin(x*5.2+.6); }
    var boxes=[], parks=[];
    for(j=0;j<G;j++) for(i=0;i<G;i++){
      var x0=i/G, y0=j/G, cx=x0+.5/G, cy=y0+.5/G, ry=riverY(cx);
      if(Math.abs(cy-ry)<.065) continue;
      var dc=Math.hypot(cx-.46,cy-.42), r=noise(i*.9,j*.9,2);
      if(r>.42 && dc>.16){ parks.push([x0,y0]); continue; }
      var dens=Math.max(0,1-dc*2.1), lots=dens>.45?4:(dens>.18?2:1), m=.16/G, w=(1/G-2*m);
      for(k=0;k<lots;k++){
        var lx=x0+m+(lots===4?(k%2)*w/2:(lots===2?k*w/2:0)), ly=y0+m+(lots===4?Math.floor(k/2)*w/2:0);
        var lw=lots===1?w:w/2-m*.4, lh=lots===4?w/2-m*.4:w;
        var h=.015+Math.pow(dens,1.6)*(.12+.1*(noise(lx*40,ly*40,1)+.5))+(noise(lx*25+9,ly*25,1)+.5)*.018;
        var nearRiver=Math.abs(cy-ry)<.14;
        if(nearRiver) h=Math.min(h,.03);
        boxes.push({x:lx,y:ly,w:lw,d:lh,h:h,flood:nearRiver});
      }
    }
    var pins=[[.46,.42,'Fire safety · market','#ef6f5e'],[.30,.66,'Pedestrian survey','#7b6cf0'],[.70,.70,'Flood-resilient housing','#0e9f8e'],[.16,.26,'Groundwater wells','#2f8fe0']];
    var st={yaw:-.62,pitch:1.0,T:0,grow:0,scan:null,a:{grid:1,water:1,parks:1,flood:1,pins:1}};
    var auto=true, drag=null, W=0, Hh=0, dpr=capture?1:Math.min(2,window.devicePixelRatio||1), visible=true, t0=performance.now();
    function size(){ W=cv.clientWidth; Hh=cv.clientHeight; cv.width=W*dpr; cv.height=Hh*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    size(); if(!capture) window.addEventListener('resize',size);
    function proj(x,y,z){
      var cx=x-.5, cy=y-.5, c=Math.cos(st.yaw), s=Math.sin(st.yaw), X=cx*c-cy*s, Y=cx*s+cy*c;
      var cp=Math.cos(st.pitch), sp=Math.sin(st.pitch), Y2=Y*cp-z*sp, Z2=Y*sp+z*cp;
      var sc=capture?Math.min(W*.62,Hh*1.12):(small?Math.min(W*.92,Hh*.62):Math.min(W*.46,Hh*.9)), d=2.6, f=d/(d+Y2);
      var ox=capture?W*.5:(small?W*.5:W*.73), oy=capture?Hh*.56:(small?Hh*.80:Hh*.5);
      return [ox+X*sc*f, oy-Z2*sc*f, Y2];
    }
    function poly(pts,fill,stroke){ ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); for(var q=1;q<pts.length;q++) ctx.lineTo(pts[q][0],pts[q][1]); ctx.closePath();
      if(fill){ ctx.fillStyle=fill; ctx.fill(); } if(stroke){ ctx.strokeStyle=stroke; ctx.stroke(); } }
    function hcol(h,f){ var t=Math.min(1,h/.24), a=[207,224,240], b=[99,205,189], c=[245,184,92], r;
      r = t<.55 ? a.map(function(v,n){return v+(b[n]-v)*(t/.55);}) : b.map(function(v,n){return v+(c[n]-v)*((t-.55)/.45);});
      return 'rgb('+Math.min(255,r[0]*f|0)+','+Math.min(255,r[1]*f|0)+','+Math.min(255,r[2]*f|0)+')'; }
    function rrect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
    function draw(){
      var A=st.a, T=st.T;
      ctx.clearRect(0,0,W,Hh);
      // ground plate with soft shadow
      var e=.035, plate=[proj(-e,-e,0),proj(1+e,-e,0),proj(1+e,1+e,0),proj(-e,1+e,0)];
      ctx.save(); ctx.shadowColor='rgba(18,38,63,.20)'; ctx.shadowBlur=50; ctx.shadowOffsetY=30; poly(plate,'#ffffff'); ctx.restore();
      ctx.lineWidth=1.2; poly(plate,'#fdfefe','rgba(18,38,63,.14)');
      // parks
      ctx.globalAlpha=A.parks;
      parks.forEach(function(p){ var m=.08/G; poly([proj(p[0]+m,p[1]+m,0),proj(p[0]+1/G-m,p[1]+m,0),proj(p[0]+1/G-m,p[1]+1/G-m,0),proj(p[0]+m,p[1]+1/G-m,0)],'#cdebd0','rgba(76,175,106,.35)'); });
      // river
      ctx.globalAlpha=A.water;
      var top=[],bot=[]; for(i=0;i<=40;i++){ var xx=i/40, ry=riverY(xx); top.push(proj(xx,ry-.06,0)); bot.unshift(proj(xx,ry+.06,0)); }
      poly(top.concat(bot),'#a9d6f6');
      ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=1.2;
      for(k=-1;k<=1;k+=2){ ctx.beginPath(); for(i=0;i<=40;i++){ var p2=proj(i/40,riverY(i/40)+k*.025+.012*Math.sin(T*.002+i*.5+k),0); i?ctx.lineTo(p2[0],p2[1]):ctx.moveTo(p2[0],p2[1]); } ctx.stroke(); }
      // road grid
      ctx.globalAlpha=A.grid; ctx.lineWidth=1; ctx.strokeStyle='rgba(18,38,63,.10)'; ctx.beginPath();
      for(i=0;i<=G;i++){ var a1=proj(i/G,0,0),a2=proj(i/G,1,0),b1=proj(0,i/G,0),b2=proj(1,i/G,0); ctx.moveTo(a1[0],a1[1]);ctx.lineTo(a2[0],a2[1]);ctx.moveTo(b1[0],b1[1]);ctx.lineTo(b2[0],b2[1]); }
      ctx.stroke();
      // flood-prone zone outline
      ctx.globalAlpha=A.flood; ctx.setLineDash([6,5]); ctx.lineWidth=1.6; ctx.strokeStyle='rgba(47,111,237,.75)'; ctx.beginPath();
      for(i=0;i<=40;i++){ var f1=proj(i/40,riverY(i/40)-.14,0); i?ctx.lineTo(f1[0],f1[1]):ctx.moveTo(f1[0],f1[1]); } ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha=1;
      // buildings, far to near
      var scan=st.scan;
      if(st.grow>0.001){
        var list=boxes.map(function(bx){ return [proj(bx.x+bx.w/2,bx.y+bx.d/2,0)[2],bx]; }).sort(function(p,q){return q[0]-p[0];});
        list.forEach(function(it){
          var bx=it[1], hit=scan!==null&&Math.abs(bx.x+bx.w/2-scan)<.035, H0=bx.h*st.grow*(hit?1.08:1), fl=bx.flood&&A.flood>.5;
          var c=[[bx.x,bx.y],[bx.x+bx.w,bx.y],[bx.x+bx.w,bx.y+bx.d],[bx.x,bx.y+bx.d]];
          var B=c.map(function(p){return proj(p[0],p[1],0);}), Tp=c.map(function(p){return proj(p[0],p[1],H0);});
          for(var sIdx=0;sIdx<4;sIdx++){
            var n=(sIdx+1)%4, face=[B[sIdx],B[n],Tp[n],Tp[sIdx]];
            var area=(face[1][0]-face[0][0])*(face[2][1]-face[0][1])-(face[2][0]-face[0][0])*(face[1][1]-face[0][1]);
            if(area>0) continue;
            var light=[.80,.93,.72,.86][sIdx];
            poly(face, fl?'rgb('+(196*light|0)+','+(220*light|0)+','+(246*light|0)+')':hcol(bx.h,light*(hit?1.08:1)));
          }
          ctx.lineWidth=.8;
          poly(Tp, fl?'#e3f0fd':hcol(bx.h,hit?1.14:1.06),'rgba(255,255,255,.75)');
        });
      }
      // scan line
      if(scan!==null&&scan>-.05&&scan<1.05){ var s1=proj(scan,-.03,0), s2=proj(scan,1.03,0); ctx.save(); ctx.strokeStyle='rgba(14,159,142,.95)'; ctx.lineWidth=2.4; ctx.shadowColor='rgba(14,159,142,.8)'; ctx.shadowBlur=14;
        ctx.beginPath(); ctx.moveTo(s1[0],s1[1]); ctx.lineTo(s2[0],s2[1]); ctx.stroke(); ctx.restore(); }
      // survey pins with pulse + labels
      if(A.pins>0.01){ ctx.globalAlpha=A.pins;
        pins.forEach(function(pn,pi){
          var base=proj(pn[0],pn[1],0), tp=proj(pn[0],pn[1],.22), ph=((T*.0011)+pi*.25)%1;
          ctx.globalAlpha=A.pins*(1-ph); ctx.strokeStyle=pn[3]; ctx.lineWidth=1.8; ctx.beginPath(); ctx.ellipse(base[0],base[1],4+ph*24,(4+ph*24)*.45,0,0,7); ctx.stroke();
          ctx.globalAlpha=A.pins; ctx.strokeStyle='rgba(18,38,63,.55)'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(base[0],base[1]); ctx.lineTo(tp[0],tp[1]); ctx.stroke();
          ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(tp[0],tp[1],7.5,0,7); ctx.fill();
          ctx.fillStyle=pn[3]; ctx.beginPath(); ctx.arc(tp[0],tp[1],5,0,7); ctx.fill();
          if(!small){ ctx.font='600 12.5px Inter,system-ui,sans-serif'; var tw=ctx.measureText(pn[2]).width;
            ctx.save(); ctx.shadowColor='rgba(18,38,63,.18)'; ctx.shadowBlur=12; ctx.shadowOffsetY=4; ctx.fillStyle='#fff'; rrect(tp[0]+11,tp[1]-13,tw+20,26,8); ctx.fill(); ctx.restore();
            ctx.fillStyle='#12263f'; ctx.fillText(pn[2],tp[0]+21,tp[1]+4.5); }
        });
        ctx.globalAlpha=1; }
    }
    if(capture){ cv.__draw=function(o){ for(var key in o){ if(key==='a'){ for(var q in o.a) st.a[q]=o.a[q]; } else st[key]=o[key]; } draw(); }; st.grow=1; draw(); return; }
    var born=null;
    function frame(now){
      if(!visible){ t0=now; requestAnimationFrame(frame); return; }
      if(born===null) born=now;
      var dt=Math.min(50,now-t0); t0=now; st.T+=dt;
      if(auto&&!reduce) st.yaw+=dt*0.00009;
      var g=Math.min(1,(now-born)/1800); st.grow=reduce?1:1-Math.pow(1-g,3);
      st.scan=reduce?null:((st.T*.00012)%1.5)-.2;
      draw(); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    function down(x,y){ drag=[x,y,st.yaw,st.pitch]; auto=false; }
    function move(x,y){ if(!drag)return; st.yaw=drag[2]+(x-drag[0])*.008; st.pitch=Math.max(.55,Math.min(1.3,drag[3]+(y-drag[1])*.004)); }
    function up(){ drag=null; setTimeout(function(){ if(!drag) auto=true; },2500); }
    cv.addEventListener('mousedown',function(e){down(e.clientX,e.clientY);});
    window.addEventListener('mousemove',function(e){move(e.clientX,e.clientY);});
    window.addEventListener('mouseup',up);
    cv.addEventListener('touchstart',function(e){ var t=e.touches[0]; down(t.clientX,t.clientY); },{passive:true});
    cv.addEventListener('touchmove',function(e){ var t=e.touches[0]; if(drag&&Math.abs(t.clientX-drag[0])>Math.abs(t.clientY-drag[1])) move(t.clientX,drag[1]); },{passive:true});
    cv.addEventListener('touchend',up);
    // live cursor read-out (illustrative grid around Rajshahi)
    var out=$('#hudc');
    if(out) cv.addEventListener('mousemove',function(e){ var r=cv.getBoundingClientRect(), u=(e.clientX-r.left)/r.width, v=(e.clientY-r.top)/r.height;
      out.textContent=(24.40-v*.06).toFixed(4)+'° N · '+(88.55+u*.10).toFixed(4)+'° E'; });
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
        ctx.strokeStyle=major?'rgba(14,159,142,.30)':'rgba(47,111,237,.12)';
        ctx.lineWidth=major?1.2:.8; ctx.beginPath();
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

  /* ---------- donut chart ---------- */
  function Donut(el){
    var data=JSON.parse(el.getAttribute('data-donut')), tot=data.reduce(function(s,d){return s+d[1];},0), r=70, C=2*Math.PI*r, off=0, svg='', leg='';
    svg+='<circle r="'+r+'" cx="100" cy="100" fill="none" stroke="#eef3f8" stroke-width="26"/>';
    data.forEach(function(d){ var len=C*d[1]/tot;
      svg+='<circle class="seg" r="'+r+'" cx="100" cy="100" fill="none" stroke="'+d[2]+'" stroke-width="26" stroke-dasharray="0 '+C+'" data-len="'+(len-2)+'" stroke-dashoffset="'+(-off)+'" style="transition:stroke-dasharray 1.2s ease" transform="rotate(-90 100 100)"/>';
      off+=len; leg+='<div><span style="background:'+d[2]+'"></span>'+d[0]+' <b>'+d[1]+'</b></div>'; });
    svg+='<text x="100" y="99" text-anchor="middle" style="font:800 36px Plus Jakarta Sans,Inter,sans-serif;fill:#12263f">'+tot+'</text><text x="100" y="122" text-anchor="middle" style="font:500 12px Inter,sans-serif;fill:#64768c">'+(el.getAttribute('data-label')||'total')+'</text>';
    el.innerHTML='<div class="donut-wrap"><svg viewBox="0 0 200 200" width="190" height="190" role="img" aria-label="'+(el.getAttribute('data-aria')||'Chart')+'">'+svg+'</svg><div class="donut-legend">'+leg+'</div></div>';
    onSee(el,function(){ $$('circle.seg',el).forEach(function(c){ c.setAttribute('stroke-dasharray',c.getAttribute('data-len')+' '+C); }); });
  }

  /* ---------- helpers ---------- */
  function onSee(el,fn){
    if(!('IntersectionObserver' in window)){ fn(el); return; }
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ fn(e.target); io.unobserve(e.target); } }); },{threshold:.15});
    io.observe(el);
  }
  function counter(el){
    var end=parseFloat(el.getAttribute('data-count')), dec=(el.getAttribute('data-count').split('.')[1]||'').length, t0=null, dur=1600;
    function step(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/dur), e=1-Math.pow(1-p,3); el.textContent=(end*e).toFixed(dec); if(p<1) requestAnimationFrame(step); }
    reduce ? (el.textContent=end.toFixed(dec)) : requestAnimationFrame(step);
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
    var page=document.body.getAttribute('data-page'); $$('.nav a[data-p]').forEach(function(a){ if(a.getAttribute('data-p')===page){ a.classList.add('active'); a.setAttribute('aria-current','page'); } });
    var yr=$('#yr'); if(yr) yr.textContent=new Date().getFullYear();

    /* custom pointer ring (desktop only) */
    if(window.matchMedia&&window.matchMedia('(hover:hover) and (pointer:fine)').matches&&!$('canvas[data-capture]')){
      var ring=document.createElement('div'); ring.className='cur-ring'; ring.setAttribute('aria-hidden','true'); document.body.appendChild(ring);
      var rx=0,ry=0,tx=0,ty=0,seen=false;
      window.addEventListener('mousemove',function(e){ tx=e.clientX; ty=e.clientY; if(!seen){ seen=true; rx=tx; ry=ty; } ring.classList.add('on');
        var t=e.target, c=t.closest?t:t.parentNode;
        ring.classList.toggle('hot',!!(c&&c.closest&&c.closest('a,button,[role=button],select,label,.site')));
        ring.classList.toggle('map',!!(t.tagName==='CANVAS'&&t.classList.contains('city'))||t.tagName==='INPUT'||t.tagName==='TEXTAREA'); },{passive:true});
      window.addEventListener('mousedown',function(){ ring.classList.add('down'); });
      window.addEventListener('mouseup',function(){ ring.classList.remove('down'); });
      document.documentElement.addEventListener('mouseleave',function(){ ring.classList.remove('on'); });
      $$('iframe').forEach(function(f){ f.addEventListener('mouseenter',function(){ ring.classList.remove('on'); }); });
      (function loop(){ var k=reduce?1:.22; rx+=(tx-rx)*k; ry+=(ty-ry)*k; ring.style.transform='translate3d('+rx.toFixed(1)+'px,'+ry.toFixed(1)+'px,0)'; requestAnimationFrame(loop); })();
    }

    /* visuals */
    $$('canvas.city').forEach(function(c){ City(c); });
    $$('canvas.contours').forEach(function(c){ Contours(c,{seed:+(c.getAttribute('data-seed')||5)}); });
    $$('[data-donut]').forEach(Donut);
    $$('.rv').forEach(function(el){ onSee(el,function(){ el.classList.add('in'); }); });
    $$('[data-count]').forEach(function(el){ onSee(el,counter); });
    $$('.fill[data-w]').forEach(function(el){ onSee(el,function(){ el.style.width=el.getAttribute('data-w')+'%'; }); });
    $$('.layers').forEach(function(el){ onSee(el,function(){ setTimeout(function(){ el.classList.add('open'); },250); }); });

    /* field-sites map */
    $$('.sitemap').forEach(function(sm){
      function pick(id){ $$('.site',sm).forEach(function(s){ s.classList.toggle('on',s.getAttribute('data-site')===id); });
        $$('.site-panel',sm).forEach(function(p){ p.classList.toggle('on',p.getAttribute('data-site')===id); });
        $$('.site-tabs button',sm).forEach(function(b){ b.classList.toggle('on',b.getAttribute('data-site')===id); b.setAttribute('aria-pressed',b.getAttribute('data-site')===id); }); }
      $$('.site',sm).forEach(function(s){ var id=s.getAttribute('data-site');
        s.addEventListener('click',function(){ pick(id); }); s.addEventListener('mouseenter',function(){ pick(id); });
        s.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(id); } }); });
      $$('.site-tabs button',sm).forEach(function(b){ b.addEventListener('click',function(){ pick(b.getAttribute('data-site')); }); });
    });

    /* filters (several filter rows can target the same list) */
    var groups={};
    $$('.filters').forEach(function(f){
      var sel=f.getAttribute('data-target'), target=$(sel), key=f.getAttribute('data-key')||'cat'; if(!target) return;
      groups[sel]=groups[sel]||{}; groups[sel][key]='all';
      function apply(){ var n=0; $$('[data-cat]',target).forEach(function(it){ var cats=it.getAttribute('data-cat').split(' '), ok=true;
          for(var g in groups[sel]){ if(groups[sel][g]!=='all'&&cats.indexOf(groups[sel][g])<0) ok=false; }
          it.classList.toggle('hide',!ok); if(ok) n++; });
        $$('[data-group]',target).forEach(function(gp){ gp.classList.toggle('hide',!$$('[data-cat]:not(.hide)',gp).length); });
        var note=$('[data-count-for="'+sel+'"]'); if(note) note.textContent='Showing '+n+' of '+$$('[data-cat]',target).length; }
      $$('button',f).forEach(function(b){ b.addEventListener('click',function(){
        $$('button',f).forEach(function(x){x.classList.remove('on');x.setAttribute('aria-pressed','false');}); b.classList.add('on'); b.setAttribute('aria-pressed','true');
        groups[sel][key]=b.getAttribute('data-f'); apply(); }); });
      apply();
    });
    if(location.hash){ var hb=$('.filters button[data-f="'+location.hash.slice(1).replace(/[^a-z]/g,'')+'"]'); if(hb){ hb.click(); setTimeout(function(){ hb.closest('section').scrollIntoView(); },60); } }

    /* project modal */
    var modal=$('#modal');
    if(modal){
      $$('.proj[data-kind]').forEach(function(p){
        function open(){ $('.mimg',modal).src=$('img',p).src; $('.mimg',modal).alt=$('h3',p).textContent;
          $('.mk',modal).textContent=p.getAttribute('data-kind'); $('.mt',modal).textContent=$('h3',p).textContent;
          $('.md',modal).innerHTML=$('.detail',p).innerHTML; modal.classList.add('open'); document.body.style.overflow='hidden'; $('.x',modal).focus(); }
        p.addEventListener('click',open); p.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
      });
      var close=function(){ modal.classList.remove('open'); document.body.style.overflow=''; };
      $('.x',modal).addEventListener('click',close);
      modal.addEventListener('click',function(e){ if(e.target===modal) close(); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
    }

    /* video play / pause */
    $$('.video-card').forEach(function(vc){ var v=$('video',vc), b=$('.vbtn',vc); if(!v||!b) return;
      b.addEventListener('click',function(){ if(v.paused){ v.play(); b.textContent='❚❚'; b.setAttribute('aria-label','Pause video'); } else { v.pause(); b.textContent='▶'; b.setAttribute('aria-label','Play video'); } });
      if(reduce){ v.pause(); v.removeAttribute('autoplay'); b.textContent='▶'; b.setAttribute('aria-label','Play video'); }
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
