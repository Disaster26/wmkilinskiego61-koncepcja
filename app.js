/* Podglad: dane przykladowe, wszystko liczone w przegladarce. */
(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var zl=function(v){return v.toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})};
var liczba=function(v,d){return v.toLocaleString('pl-PL',{minimumFractionDigits:d||0,maximumFractionDigits:d===undefined?2:d})};
var r2=function(v){return Math.round((v+Number.EPSILON)*100)/100};
var data=function(iso){var p=iso.split('-');return p[2]+'.'+p[1]+'.'+p[0]};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var MIES=['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];

/* Tabela oplat administratora: pozycje 1-5 (ceny jak we wzorze noty) */
var CENY=[
 {nazwa:'Czynsz za mieszkanie',miara:'m²',cena:4.50},
 {nazwa:'Czynsz za miejsce w garażu',miara:'m²',cena:4.50},
 {nazwa:'Wywóz odpadów komunalnych',miara:'liczba osób',cena:24.00},
 {nazwa:'Zużycie wody',miara:'m³',cena:12.73},
 {nazwa:'Opłata roczna za wodomierze PGK',miara:'zł',cena:15.73}
];

/* 29 lokali przykladowych: A1-A15 (budynek 61), B1-B14 (budynek 61A) */
var seed=7;function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}
var LOKALE=[],garazeA=[2,4,7,9,12,14],garazeB=[1,3,6,8,11,13];
for(var i=1;i<=29;i++){
 var bud=i<=15?'A':'B',n=i<=15?i:i-15,maG=(bud==='A'?garazeA:garazeB).indexOf(n)>-1;
 var poprz=Math.round(180+rnd()*420),zuz=Math.round(3+rnd()*9);
 LOKALE.push({nr:bud+n,bud:bud==='A'?'61':'61A',m2:r2(38+rnd()*42),g:maG?r2(16+rnd()*18):0,os:1+Math.floor(rnd()*4),poprz:poprz,obecny:poprz+zuz,odsetki:0,celowe:0,inne:0,niedop:0,nadp:0,doRozl:0,uwagi:''});
}
/* lokal demo mieszkanca */
var DEMO=LOKALE[6];Object.assign(DEMO,{m2:64.35,g:18.50,os:2,poprz:405,obecny:412});

var OKRES={rok:2026,mies:11,wyst:'2026-11-01',platnosc:'2026-11-10',odsetkiOd:'2026-11-12',odczyt:'2026-11-01',odczytPoprz:'2026-10-01',roczna:true,celowe:0};

function nota(l,ok,ceny){
 ceny=ceny||CENY;ok=ok||OKRES;
 var w=Math.max(0,l.obecny-l.poprz);
 var rows=[
  {p:1,n:ceny[0].nazwa,m:ceny[0].miara,il:l.m2,ild:2,c:ceny[0].cena,v:r2(l.m2*ceny[0].cena)},
  {p:2,n:ceny[1].nazwa,m:ceny[1].miara,il:l.g,ild:2,c:ceny[1].cena,v:r2(l.g*ceny[1].cena),brak:!l.g},
  {p:3,n:ceny[2].nazwa,m:ceny[2].miara,il:l.os,ild:0,c:ceny[2].cena,v:r2(l.os*ceny[2].cena)},
  {p:4,n:ceny[3].nazwa,m:ceny[3].miara,il:w,ild:0,c:ceny[3].cena,v:r2(w*ceny[3].cena),woda:true},
  {p:5,n:ceny[4].nazwa,m:ceny[4].miara,v:ok.roczna?r2(ceny[4].cena):0},
  {p:6,n:'Odsetki za nieterminowe wpłaty',m:'zł',v:l.odsetki},
  {p:7,n:'Wpłaty celowe z Uchwały z Zebrania',m:'zł',v:r2(l.celowe+(ok.celowe||0))},
  {p:8,n:'Wpłaty inne',m:'zł',v:l.inne},
  {p:9,n:'Niedopłata (+)',m:'zł',v:l.niedop},
  {p:10,n:'Nadpłata (-)',m:'zł',v:l.nadp}
 ];
 var suma=0;for(var k=0;k<8;k++)suma+=rows[k].v;suma=r2(suma+l.niedop-l.nadp);
 return {l:l,ok:ok,rows:rows,woda:w,suma:Math.max(0,suma),doRozl:suma<0?r2(-suma):l.doRozl};
}

function notaHTML(N,opt){
 opt=opt||{};var ok=N.ok,l=N.l;
 var t='<div class="nota'+(opt.mala?' mala':'')+'"><div class="nota-dach" aria-hidden="true"></div><div class="nota-in">';
 t+='<div class="nota-nag"><div><h3>Nota rozliczeniowa za '+MIES[ok.mies-1]+' '+ok.rok+'</h3><p>Lokal '+l.nr+', ul. Kilińskiego '+l.bud+', 97-500 Radomsko</p></div>';
 t+='<div class="nota-kwota"><span>Do zapłaty</span><b data-suma>'+zl(N.suma)+' zł</b><span>do '+data(ok.platnosc)+'</span></div></div>';
 /* tabela jak w arkuszu */
 t+='<div class="tab-wrap"><table class="nota-tab"><thead><tr><th>Poz.</th><th>Nazwa opłaty</th><th>Miara</th><th class="l">Ilość</th><th class="l">Cena jedn. zł brutto</th><th class="l">Wartość brutto zł</th><th class="l">Stan wodomierza obecny / data</th><th class="l">Poprzedni / data</th></tr></thead><tbody>';
 N.rows.forEach(function(r){
  var il=r.il===undefined?'':(r.brak?'nie dotyczy':liczba(r.il,r.ild)),c=r.c===undefined?'':zl(r.c);
  t+='<tr'+(r.p===9||r.p===10?' class="sep"':'')+'><td>'+r.p+'</td><td>'+esc(r.n)+'</td><td>'+esc(r.m)+'</td><td class="l">'+il+'</td><td class="l">'+c+'</td><td class="l" data-v="'+r.p+'">'+zl(r.v)+'</td>';
  t+=r.woda?'<td class="l">'+liczba(l.obecny,0)+'<small>'+data(ok.odczyt)+'</small></td><td class="l">'+liczba(l.poprz,0)+'<small>'+data(ok.odczytPoprz)+'</small></td>':'<td></td><td></td>';
  t+='</tr>';
 });
 t+='<tr class="suma"><td>11</td><td colspan="4">Kwota należności ogółem do zapłaty</td><td class="l">'+zl(N.suma)+'</td><td></td><td></td></tr>';
 t+='<tr><td>12</td><td colspan="4">Kwota do rozliczenia w następnej Nocie jako nadpłata</td><td class="l">'+zl(N.doRozl)+'</td><td></td><td></td></tr>';
 t+='</tbody></table></div>';
 /* wersja na telefon: kazda pozycja jako wiersz z wyliczeniem */
 t+='<ol class="nota-lista">';
 N.rows.forEach(function(r){
  var wyl='';
  if(r.brak)wyl='nie dotyczy';
  else if(r.woda)wyl=liczba(l.obecny,0)+' − '+liczba(l.poprz,0)+' = '+r.il+' m³ × '+zl(r.c)+' zł';
  else if(r.il!==undefined)wyl=liczba(r.il,r.ild)+' '+(r.m==='liczba osób'?'os.':r.m)+' × '+zl(r.c)+' zł';
  t+='<li><span class="np">'+r.p+'</span><div><b>'+esc(r.n)+'</b>'+(wyl?'<small>'+wyl+'</small>':'')+(r.woda?'<small>odczyt '+data(ok.odczyt)+', poprzedni '+data(ok.odczytPoprz)+'</small>':'')+'</div><span class="kw">'+zl(r.v)+' zł</span></li>';
 });
 t+='<li class="suma"><span class="np">11</span><div><b>Kwota należności ogółem do zapłaty</b></div><span class="kw">'+zl(N.suma)+' zł</span></li>';
 t+='<li><span class="np">12</span><div><b>Kwota do rozliczenia w następnej Nocie jako nadpłata</b></div><span class="kw">'+zl(N.doRozl)+' zł</span></li></ol>';
 t+='<dl class="nota-daty"><div><dt>13. Data wystawienia Noty</dt><dd>'+data(ok.wyst)+'</dd></div><div><dt>14. Płatność do</dt><dd>'+data(ok.platnosc)+'</dd></div><div><dt>15. Odsetki naliczane od</dt><dd>'+data(ok.odsetkiOd)+'</dd></div><div><dt>16. Uwagi do Noty</dt><dd>'+(l.uwagi?esc(l.uwagi):'brak')+'</dd></div></dl>';
 t+='</div></div>';
 return t;
}
window.WM={nota:nota,notaHTML:notaHTML,CENY:CENY,LOKALE:LOKALE,DEMO:DEMO,OKRES:OKRES,zl:zl,data:data,MIES:MIES,liczba:liczba,esc:esc};

/* zakladki */
function zakladki(root){
 var tabs=$$('[data-tab]',root);
 function pokaz(id,fokus){
  tabs.forEach(function(t){var a=t.dataset.tab===id;t.classList.toggle('akt',a);t.setAttribute('aria-selected',a)});
  $$('[data-panel]',root).forEach(function(p){p.hidden=p.dataset.panel!==id});
  if(fokus){var p=$('[data-panel="'+id+'"]',root);if(p){p.setAttribute('tabindex','-1');p.focus({preventScroll:true});var y=p.getBoundingClientRect().top+scrollY-90;if(y<scrollY)scrollTo(0,y)}}
 }
 root.addEventListener('click',function(e){var t=e.target.closest('[data-tab],[data-idz]');if(!t)return;e.preventDefault();pokaz(t.dataset.tab||t.dataset.idz,true)});
 return pokaz;
}

/* ===== STREFA MIESZKANCA ===== */
function strefa(){
 var log=$('#logowanie'),app=$('#app');
 function wejdz(e){e&&e.preventDefault();log.hidden=true;app.hidden=false;scrollTo(0,0);$('#app h2').focus()}
 $('#form-log').addEventListener('submit',wejdz);$('#demo-wejdz').addEventListener('click',wejdz);
 $('#wyloguj').addEventListener('click',function(){app.hidden=true;log.hidden=false;scrollTo(0,0)});
 var pokaz=zakladki(app);pokaz('pulpit');
 var N=nota(DEMO);
 $('#nota-biezaca').innerHTML=notaHTML(N);
 $('#pulpit-kwota').textContent=zl(N.suma)+' zł';
 /* historia: poprzednie miesiace */
 var hist=[{m:11,z:7,ro:true},{m:10,z:8},{m:9,z:6,cel:120},{m:8,z:9,ods:2.15},{m:7,z:7}],stan=412;
 var lista=$('#historia-lista'),out='';
 hist.forEach(function(h,ix){
  var l=Object.assign({},DEMO,{obecny:stan,poprz:stan-h.z,odsetki:h.ods||0,celowe:h.cel||0,uwagi:h.cel?'Wpłata celowa zgodnie z Uchwałą nr 3/2026.':''});stan-=h.z;
  var mm=('0'+h.m).slice(-2),pm=('0'+(h.m-1)).slice(-2);
  var ok={rok:2026,mies:h.m,wyst:'2026-'+mm+'-01',platnosc:'2026-'+mm+'-10',odsetkiOd:'2026-'+mm+'-12',odczyt:'2026-'+mm+'-01',odczytPoprz:'2026-'+pm+'-01',roczna:!!h.ro,celowe:0};
  var n=nota(l,ok);h.n=n;
  out+='<li><button type="button" data-h="'+ix+'"'+(ix===0?' class="akt"':'')+'><span>'+MIES[h.m-1]+' 2026</span><b>'+zl(n.suma)+' zł</b><small>'+(ix===0?'bieżąca, termin '+data(ok.platnosc):'rozliczona')+'</small></button></li>';
 });
 lista.innerHTML=out;
 var hp=$('#historia-nota');hp.innerHTML=notaHTML(hist[0].n);
 lista.addEventListener('click',function(e){var b=e.target.closest('button[data-h]');if(!b)return;$$('button',lista).forEach(function(x){x.classList.toggle('akt',x===b)});hp.innerHTML=notaHTML(hist[+b.dataset.h].n);if(innerWidth<900)hp.scrollIntoView({behavior:'smooth',block:'start'})});
 $$('[data-druk]').forEach(function(b){b.addEventListener('click',function(){print()})});
 /* glosowanie demo */
 $$('.glos').forEach(function(g){g.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;$$('button',g).forEach(function(x){x.setAttribute('aria-pressed',x===b)});var w=g.nextElementSibling;w.hidden=false;w.textContent='Zapisano odpowiedź: '+b.textContent.toLowerCase()+'. W podglądzie głos nie jest nigdzie wysyłany.'})});
}

/* ===== PANEL ZARZADU ===== */
function admin(){
 var root=$('#panel'),pokaz=zakladki(root);pokaz('oplaty');
 var tb=$('#ceny-tab tbody');
 tb.innerHTML=CENY.map(function(c,i){return '<tr><td>'+(i+1)+'</td><td><input aria-label="Nazwa opłaty '+(i+1)+'" data-nazwa="'+i+'" value="'+esc(c.nazwa)+'"></td><td>'+esc(c.miara)+'</td><td><div class="cena-in"><input aria-label="Cena jednostkowa brutto pozycji '+(i+1)+'" type="number" inputmode="decimal" step="0.01" min="0" data-cena="'+i+'" value="'+c.cena.toFixed(2)+'"><span>zł</span></div></td></tr>'}).join('');
 function przelicz(blysk){
  var SEL='#podglad-noty .kw,#podglad-noty [data-suma],#suma-wszystkich,#suma-a7';
  var przed=$$(SEL).map(function(e){return e.textContent});
  var N=nota(DEMO);$('#podglad-noty').innerHTML=notaHTML(N,{mala:true});
  var suma=0;LOKALE.forEach(function(l){suma+=nota(l).suma});
  $('#suma-wszystkich').textContent=zl(suma)+' zł';$('#suma-a7').textContent=zl(N.suma)+' zł';
  if(blysk){$$(SEL).forEach(function(e,i){if(przed[i]!==undefined&&przed[i]!==e.textContent){e.classList.remove('blysk');void e.offsetWidth;e.classList.add('blysk')}})}
  rysujLokale();rysujWode();
 }
 tb.addEventListener('input',function(e){var t=e.target;if(t.dataset.cena!==undefined){var v=parseFloat(String(t.value).replace(',','.'));if(!isNaN(v)&&v>=0){CENY[+t.dataset.cena].cena=v;przelicz(true)}}else if(t.dataset.nazwa!==undefined){CENY[+t.dataset.nazwa].nazwa=t.value||'Opłata';przelicz(false)}});
 function rysujLokale(){
  var s=0;$('#lokale-tab tbody').innerHTML=LOKALE.map(function(l){var n=nota(l);s+=n.suma;return '<tr'+(l===DEMO?' class="demo"':'')+'><td><b>'+l.nr+'</b></td><td>'+l.bud+'</td><td>Właściciel lokalu '+l.nr+'</td><td class="l">'+liczba(l.m2,2)+'</td><td class="l">'+(l.g?liczba(l.g,2):'-')+'</td><td class="l">'+l.os+'</td><td class="l">'+zl(n.suma)+'</td><td><span class="ok">aktywne</span></td></tr>'}).join('');
  $('#lokale-suma').textContent=zl(s)+' zł';
 }
 function rysujWode(){
  $('#woda-tab tbody').innerHTML=LOKALE.map(function(l,i){var w=Math.max(0,l.obecny-l.poprz);return '<tr><td><b>'+l.nr+'</b></td><td class="l">'+l.poprz+'</td><td class="l"><input aria-label="Stan obecny wodomierza lokalu '+l.nr+'" type="number" inputmode="numeric" min="0" data-woda="'+i+'" value="'+l.obecny+'"></td><td class="l">'+w+'</td><td class="l">'+zl(w*CENY[3].cena)+'</td></tr>'}).join('');
 }
 var wt=$('#woda-tab');
 wt.addEventListener('change',function(e){var t=e.target;if(t.dataset.woda===undefined)return;var l=LOKALE[+t.dataset.woda],v=parseInt(t.value,10);if(isNaN(v)||v<l.poprz){t.value=l.obecny;$('#woda-info').textContent='Lokal '+l.nr+': stan obecny nie może być mniejszy niż poprzedni ('+l.poprz+').';return}l.obecny=v;$('#woda-info').textContent='Zapisano stan lokalu '+l.nr+': zużycie '+(v-l.poprz)+' m³.';przelicz(false)});
 $('#woda-import').addEventListener('click',function(){$('#woda-info').textContent='W docelowej stronie tutaj wczytuje się plik z odczytem zdalnym wodomierzy, a stany wpisują się same. W podglądzie stany są już wpisane.'});
 /* noty */
 var f=$('#form-noty');
 f.addEventListener('submit',function(e){
  e.preventDefault();
  var mi=+f.mies.value;OKRES.mies=mi;var mm=('0'+mi).slice(-2),pm=('0'+(mi===1?12:mi-1)).slice(-2);
  OKRES.wyst=f.wyst.value;OKRES.platnosc=f.plat.value;OKRES.odsetkiOd=f.ods.value;OKRES.odczyt='2026-'+mm+'-01';OKRES.odczytPoprz='2026-'+pm+'-01';
  OKRES.roczna=f.roczna.checked;OKRES.celowe=parseFloat(String(f.celowe.value).replace(',','.'))||0;
  var s=0,rows=LOKALE.map(function(l,i){var n=nota(l);s+=n.suma;return '<tr><td><b>'+l.nr+'</b></td><td class="l">'+zl(n.suma)+'</td><td><button type="button" class="link" data-pokaz="'+i+'">Pokaż notę</button></td></tr>'}).join('');
  $('#noty-wynik').hidden=false;
  $('#noty-podsum').textContent='Wygenerowano 29 not za '+MIES[mi-1]+' 2026. Suma należności: '+zl(s)+' zł. Właściciele zobaczą swoje noty po zalogowaniu.';
  $('#noty-tab tbody').innerHTML=rows;$('#noty-jedna').innerHTML='';
  przelicz(false);
  $('#noty-podsum').focus();
 });
 $('#noty-tab').addEventListener('click',function(e){var b=e.target.closest('[data-pokaz]');if(!b)return;var j=$('#noty-jedna');j.innerHTML=notaHTML(nota(LOKALE[+b.dataset.pokaz]));j.scrollIntoView({behavior:'smooth',block:'start'})});
 /* ogloszenia */
 var fo=$('#form-ogl');
 fo.addEventListener('submit',function(e){e.preventDefault();var t=fo.tytul.value.trim();if(!t){fo.tytul.focus();return}var li=document.createElement('li');li.innerHTML='<b>'+esc(t)+'</b><span>'+(fo.stala.checked?'informacja stała':'nowa informacja')+', dodano dziś</span>';$('#ogl-lista').prepend(li);fo.reset();$('#ogl-info').textContent='Ogłoszenie widzą teraz wszyscy mieszkańcy w Strefie mieszkańca (w podglądzie tylko na tej stronie).'});
 przelicz(false);
}

var pg=document.body.dataset.page;
if(pg==='strefa')strefa();if(pg==='admin')admin();
})();
