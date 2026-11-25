/* Podglad: dane przykladowe, wszystko liczone w przegladarce. */
(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var zl=function(v){return v.toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})};
var m3=function(v){return v==null?'brak':v.toLocaleString('pl-PL',{maximumFractionDigits:3})};
var liczba=function(v,d){return v.toLocaleString('pl-PL',{minimumFractionDigits:d||0,maximumFractionDigits:d===undefined?2:d})};
var r2=function(v){return Math.round((v+Number.EPSILON)*100)/100};
var data=function(iso){var p=iso.split('-');return p[2]+'.'+p[1]+'.'+p[0]};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var MIES=['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];

/* Tabela oplat administratora: pozycje 1-5 (ceny jak we wzorze noty) */
var CENY=[
 {nazwa:'Czynsz za mieszkanie i komórkę',miara:'m²',typ:'m2',cena:4.50},
 {nazwa:'Czynsz za miejsce w garażu',miara:'m²',typ:'garaz',cena:4.50},
 {nazwa:'Wywóz odpadów komunalnych',miara:'liczba osób',typ:'osoby',cena:24.00},
 {nazwa:'Zużycie wody',miara:'m³',typ:'woda',cena:12.73},
 {nazwa:'Opłata roczna za wodomierze PGK',miara:'zł, jednorazowo',typ:'roczna',cena:15.73,dolicz:true}
];
/* ceny wzoru noty (do historii not i przywracania) oraz tabela zapisana przez Zarzad w tej przegladarce */
var CENY_BAZA=CENY.map(function(c){return Object.assign({},c)});
var CENY_KLUCZ='wmk61-ceny',CENY_ZAP=null;
(function(){try{var z=JSON.parse(localStorage.getItem(CENY_KLUCZ)||'null');if(!z||!Array.isArray(z.ceny))return;var L=z.ceny.filter(function(c){return c&&c.nazwa&&typeof c.cena==='number'&&isFinite(c.cena)});if(!L.length&&z.ceny.length)return;CENY.length=0;L.forEach(function(c){CENY.push(c)});CENY_ZAP=z.zapisano||null}catch(e){}})();
function zapiszCeny(){try{CENY_ZAP=Date.now();localStorage.setItem(CENY_KLUCZ,JSON.stringify({ceny:CENY,zapisano:CENY_ZAP}));return true}catch(e){return false}}

/* Lokale wg listy Zarzadu (24.11.2026): numer, m2 mieszkania, liczba garazy po 34 m2, liczba osob do odpadow.
   Bloki 61 i 61A sa numerowane tak samo. G6 to garaz wlasciciela z sasiedniej wspolnoty. */
var GAR_M2=34;
var SPIS={'61':[['A1',113.26,0,1],['A2',100.63,0,2],['A3',112.19,1,2],['A4',99.45,2,2],['A5',68.89,0,2],['A6',72.20,0,0],['B1',74.72,1,1],['B2',50.61,0,2],['B3',83.27,0,2],['B4',77.77,0,1],['B5',55.48,0,3],['B6',87.45,0,1],['B7',72.20,0,4],['B8',68.33,1,4]],
 '61A':[['A1',113.26,2,4],['A2',100.63,1,3],['A3',112.19,0,2],['A4',99.45,0,1],['A5',68.89,0,3],['A6',72.20,0,2],['B1',74.72,1,2],['B2',50.61,0,1],['B3',83.27,0,3],['B4',77.77,0,2],['B5',55.48,1,2],['B6',87.45,0,0],['B7',72.20,0,5],['B8',68.33,1,0],['G6',0,1,0]]};
/* stany wodomierzy przykladowe */
var seed=7;function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}
var LOKALE=[];
['61','61A'].forEach(function(b){SPIS[b].forEach(function(s){
 var gar=[];for(var k=0;k<s[2];k++)gar.push({m2:GAR_M2,miejsce:''});
 var tylkoG=!s[1],poprz=Math.round(180+rnd()*420),zuz=Math.round(3+rnd()*9),os=(rnd(),s[3]);
 LOKALE.push({nr:s[0],bud:b,m2:s[1],gar:gar,tylkoG:tylkoG,os:tylkoG?0:os,poprz:tylkoG?0:poprz,obecny:tylkoG?0:poprz+zuz,odsetki:0,celowe:0,inne:0,niedop:0,nadp:0,doRozl:0,uwagi:'',wlasc:'',wodaZero:false});
})});
/* lokal demo mieszkanca: B1 w bloku 61 (mieszkanie i garaz) */
var DEMO=LOKALE.filter(function(l){return l.bud==='61'&&l.nr==='B1'})[0];Object.assign(DEMO,{poprz:405,obecny:412});

var OKRES={rok:2026,mies:11,wyst:'2026-11-01',platnosc:'2026-11-10',odsetkiOd:'2026-11-12',odczyt:'2026-11-01',odczytPoprz:'2026-09-01',cykl:2,roczna:true,celowe:0};

/* stany wodomierzy zapisane w panelu Zarzadu (w tej przegladarce) */
var WODA_KLUCZ='wmk61-wodomierze';
function zuzycie(l){if(l.tylkoG||l.poprz==null||l.obecny==null)return 0;var w=l.obecny-l.poprz;return w>0?Math.round(w*1000)/1000:0}
(function(){try{var z=JSON.parse(localStorage.getItem(WODA_KLUCZ)||'null');if(!z||!z.stany)return;LOKALE.forEach(function(l){var s=z.stany[l.bud+'/'+l.nr];if(s){l.poprz=s[0];l.obecny=s[1]}});if(z.odczyt){OKRES.odczyt=z.odczyt;OKRES.odczytPoprz=z.odczytPoprz}if(z.cykl)OKRES.cykl=z.cykl;else if(z.odczyt==='2026-11-01'&&z.odczytPoprz==='2026-10-01')OKRES.odczytPoprz='2026-09-01';OKRES.zapisano=z.zapisano||null}catch(e){}})();

/* dane lokali zmieniane przez Zarzad (numery miejsc w garazu, wlasciciel, osoby, odsetki, wplaty, uwagi)
   i historia zmian w E-Kartotekach; w podgladzie zapis w tej przegladarce, docelowo w bazie na serwerze */
var LOK_KLUCZ='wmk61-lokale',ZMIANY_KLUCZ='wmk61-kartoteka-zmiany',LOG_KLUCZ='wmk61-logowania';
var POLA_KART=['wlasc','os','odsetki','celowe','inne','niedop','nadp','wodaZero','uwagi'];
function klucz(l){return l.bud+'/'+l.nr}
function login(l){return l.bud+'-'+l.nr}
function czytajJSON(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function piszJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
LOKALE.forEach(function(l){l._baza={};POLA_KART.forEach(function(p){l._baza[p]=l[p]})});
(function(){var z=czytajJSON(LOK_KLUCZ,{});LOKALE.forEach(function(l){var s=z[klucz(l)];if(!s)return;if(s.gar)s.gar.forEach(function(m,k){if(l.gar[k])l.gar[k].miejsce=String(m||'')});POLA_KART.forEach(function(p){if(s[p]!==undefined)l[p]=s[p]})})})();
function zapiszLokale(){var z={};LOKALE.forEach(function(l){var s={},m=false;if(l.gar.some(function(g){return g.miejsce})){s.gar=l.gar.map(function(g){return g.miejsce});m=true}POLA_KART.forEach(function(p){if(l[p]!==l._baza[p]){s[p]=l[p];m=true}});if(m)z[klucz(l)]=s});return piszJSON(LOK_KLUCZ,z)}
function wlascTxt(l){return l.wlasc||(l.tylkoG?'Właściciel garażu '+l.nr+' (sąsiednia wspólnota)':'Właściciel lokalu '+l.nr)}
function godz(d){d=new Date(d);return ('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.'+d.getFullYear()+', godz. '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}

function nota(l,ok,ceny){
 ceny=ceny||CENY;ok=ok||OKRES;
 var w=zuzycie(l),rows=[];
 ceny.forEach(function(c){
  var r={n:c.nazwa,m:c.miara,c:c.cena};
  if(c.typ==='m2'){r.il=l.m2;r.ild=2;r.v=r2(l.m2*c.cena);r.brak=!l.m2;rows.push(r)}
  else if(c.typ==='garaz'){
   if(!l.gar.length){r.il=0;r.v=0;r.brak=true;rows.push(r)}
   l.gar.forEach(function(g){rows.push({n:c.nazwa+(g.miejsce?', miejsce nr '+g.miejsce:''),m:c.miara,c:c.cena,il:g.m2,ild:2,v:r2(g.m2*c.cena)})});
  }
  else if(c.typ==='osoby'){r.il=l.os;r.ild=0;r.v=r2(l.os*c.cena);r.brak=l.tylkoG;rows.push(r)}
  else if(c.typ==='woda'){if(ok.bezWody){r.n+=' (bez odczytu w tym miesiącu)';r.il=0;r.m3=true;r.v=0;r.brak=l.tylkoG;rows.push(r)}else if(l.wodaZero&&!l.tylkoG){r.n+=' (opłacona, wyzerowana przez Zarząd)';r.il=w;r.m3=true;r.v=0;rows.push(r)}else{r.il=w;r.m3=true;r.v=r2(w*c.cena);r.woda=!l.tylkoG;r.brak=l.tylkoG;rows.push(r)}}
  else if(c.typ==='roczna'){var dl=c.dolicz===undefined?ok.roczna:c.dolicz;if(!dl)return;delete r.c;r.m='zł';r.v=l.tylkoG?0:r2(c.cena);rows.push(r)}
  else{delete r.c;r.v=r2(c.cena);rows.push(r)}
 });
 rows.push({n:'Odsetki za nieterminowe wpłaty',m:'zł',v:l.odsetki},{n:'Wpłaty celowe z Uchwały z Zebrania',m:'zł',v:r2(l.celowe+(ok.celowe||0))},{n:'Wpłaty inne',m:'zł',v:l.inne},{n:'Niedopłata (+)',m:'zł',v:l.niedop,sep:true},{n:'Nadpłata (-)',m:'zł',v:l.nadp,sep:true});
 rows.forEach(function(r,i){r.p=i+1});
 var suma=0;for(var k=0;k<rows.length-2;k++)suma+=rows[k].v;suma=r2(suma+l.niedop-l.nadp);
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
  var il=r.il===undefined?'':(r.brak?'nie dotyczy':(r.m3?m3(r.il):liczba(r.il,r.ild))),c=r.c===undefined?'':zl(r.c);
  t+='<tr'+(r.sep?' class="sep"':'')+'><td>'+r.p+'</td><td>'+esc(r.n)+'</td><td>'+esc(r.m)+'</td><td class="l">'+il+'</td><td class="l">'+c+'</td><td class="l" data-v="'+r.p+'">'+zl(r.v)+'</td>';
  t+=r.woda?'<td class="l">'+m3(l.obecny)+'<small>'+data(ok.odczyt)+'</small></td><td class="l">'+m3(l.poprz)+'<small>'+data(ok.odczytPoprz)+'</small></td>':'<td></td><td></td>';
  t+='</tr>';
 });
 var P=N.rows.length;
 t+='<tr class="suma"><td>'+(P+1)+'</td><td colspan="4">Kwota należności ogółem do zapłaty</td><td class="l">'+zl(N.suma)+'</td><td></td><td></td></tr>';
 t+='<tr><td>'+(P+2)+'</td><td colspan="4">Kwota do rozliczenia w następnej Nocie jako nadpłata</td><td class="l">'+zl(N.doRozl)+'</td><td></td><td></td></tr>';
 t+='</tbody></table></div>';
 /* wersja na telefon: kazda pozycja jako wiersz z wyliczeniem */
 t+='<ol class="nota-lista">';
 N.rows.forEach(function(r){
  var wyl='';
  if(r.brak)wyl='nie dotyczy';
  else if(r.woda)wyl=m3(l.obecny)+' − '+m3(l.poprz)+' = '+m3(r.il)+' m³ × '+zl(r.c)+' zł';
  else if(r.il!==undefined)wyl=liczba(r.il,r.ild)+' '+(r.m==='liczba osób'?'os.':r.m)+' × '+zl(r.c)+' zł';
  t+='<li><span class="np">'+r.p+'</span><div><b>'+esc(r.n)+'</b>'+(wyl?'<small>'+wyl+'</small>':'')+(r.woda?'<small>odczyt '+data(ok.odczyt)+', poprzedni '+data(ok.odczytPoprz)+'</small>':'')+'</div><span class="kw">'+zl(r.v)+' zł</span></li>';
 });
 t+='<li class="suma"><span class="np">'+(P+1)+'</span><div><b>Kwota należności ogółem do zapłaty</b></div><span class="kw">'+zl(N.suma)+' zł</span></li>';
 t+='<li><span class="np">'+(P+2)+'</span><div><b>Kwota do rozliczenia w następnej Nocie jako nadpłata</b></div><span class="kw">'+zl(N.doRozl)+' zł</span></li></ol>';
 t+='<dl class="nota-daty"><div><dt>'+(P+3)+'. Data wystawienia Noty</dt><dd>'+data(ok.wyst)+'</dd></div><div><dt>'+(P+4)+'. Płatność do</dt><dd>'+data(ok.platnosc)+'</dd></div><div><dt>'+(P+5)+'. Odsetki naliczane od</dt><dd>'+data(ok.odsetkiOd)+'</dd></div><div><dt>'+(P+6)+'. Uwagi do Noty</dt><dd>'+(l.uwagi?esc(l.uwagi):'brak')+'</dd></div></dl>';
 t+='</div></div>';
 return t;
}
/* historia not lokalu: biezaca nota + poprzednie miesiace (dane przykladowe) */
function historia(l){
 var hist=[{m:11,z:7},{m:10,z:8},{m:9,z:6,cel:120},{m:8,z:9,ods:2.15},{m:7,z:7}];
 var stan=l.poprz!=null?l.poprz:(l.obecny!=null?l.obecny:400);
 var cenyH=CENY_BAZA.map(function(c){return Object.assign({},c,{dolicz:undefined})});
 return hist.map(function(h,ix){
  var mm=('0'+h.m).slice(-2),pm=('0'+(h.m-1)).slice(-2);
  if(ix===0)return {m:h.m,n:nota(l),opis:'bieżąca, termin '+data(OKRES.platnosc)};
  var x=Object.assign({},l,{obecny:stan,poprz:stan-h.z,odsetki:h.ods||0,celowe:h.cel||0,inne:0,niedop:0,nadp:0,wodaZero:false,uwagi:h.cel?'Wpłata celowa zgodnie z Uchwałą nr 3/2026.':''});stan-=h.z;
  var ok={rok:2026,mies:h.m,wyst:'2026-'+mm+'-01',platnosc:'2026-'+mm+'-10',odsetkiOd:'2026-'+mm+'-12',odczyt:'2026-'+mm+'-01',odczytPoprz:'2026-'+pm+'-01',roczna:false,celowe:0};
  return {m:h.m,n:nota(x,ok,cenyH),opis:'rozliczona'};
 });
}
function histListaHTML(H,akt,attr){return H.map(function(h,ix){return '<li><button type="button" '+attr+'="'+ix+'"'+(ix===akt?' class="akt"':'')+'><span>'+MIES[h.m-1]+' 2026</span><b>'+zl(h.n.suma)+' zł</b><small>'+h.opis+'</small></button></li>'}).join('')}

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


/* ===== UCHWALY I GLOSOWANIE (wspolne dla Strefy i Panelu) =====
   Udzialy w podgladzie z powierzchni lokali (mieszkanie + garaze); docelowo udzialy z listy Zarzadu.
   Zapis w tej przegladarce, docelowo w bazie na serwerze. */
var UCH_KLUCZ='wmk61-uchwaly';
var GLOSY=['za','przeciw','wstrz'],GL_TXT={za:'za',przeciw:'przeciw',wstrz:'wstrzymuję się'},SP_TXT={strona:'przez stronę',osobiscie:'osobiście',mail:'mailem'};
function pow(l){return (l.m2||0)+l.gar.length*GAR_M2}
var POW_SUMA=LOKALE.reduce(function(s,l){return l.tylkoG?s:s+pow(l)},0);
function udzial(l){return pow(l)/POW_SUMA}
function uchStart(){
 var u={tryb:'udzialy',lista:[
  {id:'u1',nr:'1/2026',tytul:'w sprawie zatwierdzenia sprawozdania finansowego za 2025 rok',opis:'Treść uchwały i sprawozdanie w PDF.',do:'2026-11-30',koniec:null},
  {id:'u2',nr:'2/2026',tytul:'w sprawie wysokości zaliczek na koszty zarządu nieruchomością wspólną',opis:'Treść uchwały w PDF.',do:'2026-11-30',koniec:null},
  {id:'u3',nr:'3/2026',tytul:'w sprawie wpłaty celowej na naprawę nawierzchni',opis:'Treść uchwały w PDF.',do:'2026-03-12',koniec:'2026-03-12'}],glosy:{u1:{},u2:{},u3:{}}};
 var s=11;function r(){s=(s*16807)%2147483647;return (s-1)/2147483646}
 LOKALE.forEach(function(l){if(l.tylkoG||l===DEMO)return;
  [['u1',.55],['u2',.4],['u3',.85]].forEach(function(p){if(r()<p[1]){var x=r(),g=x<.78?'za':x<.9?'przeciw':'wstrz',y=r();u.glosy[p[0]][klucz(l)]={g:g,sp:y<.6?'strona':y<.85?'osobiscie':'mail'}}})});
 return u}
var UCH=czytajJSON(UCH_KLUCZ,null);if(!UCH||!UCH.lista||!UCH.glosy)UCH=uchStart();
function uchZapisz(){return piszJSON(UCH_KLUCZ,UCH)}
function glosujacy(){return LOKALE.filter(function(l){return !l.tylkoG})}
function wynik(u){
 var g=UCH.glosy[u.id]||{},w={za:0,przeciw:0,wstrz:0},ile=0,tryb=UCH.tryb;
 glosujacy().forEach(function(l){var v=g[klucz(l)];if(!v)return;ile++;w[v.g]+=tryb==='udzialy'?udzial(l):1});
 var wsz=tryb==='udzialy'?1:glosujacy().length;
 return {w:w,ile:ile,wsz:wsz,tryb:tryb,podjeta:w.za>wsz/2,razem:glosujacy().length}}
function glosowTxt(n){return n===1?'głos':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'głosy':'głosów'}
function wynikTxt(R){var f=function(k){return R.tryb==='udzialy'?liczba(R.w[k]*100,1)+'% udziałów':R.w[k]+' '+glosowTxt(R.w[k])};
 return 'za: '+f('za')+', przeciw: '+f('przeciw')+', wstrzymało się: '+f('wstrz')}
function pasekHTML(R){return '<div class="uch-pas" aria-hidden="true">'+GLOSY.map(function(k){var p=R.w[k]/R.wsz*100;return p>0?'<span class="p-'+k+'" style="width:'+p.toFixed(2)+'%"></span>':''}).join('')+'</div>'}

/* ===== STREFA MIESZKANCA ===== */
function strefa(){
 var log=$('#logowanie'),app=$('#app');
 function wejdz(e){
  e&&e.preventDefault();
  var wl=e&&e.type==='submit'?$('#login').value.trim():'';
  if(wl&&!LOKALE.some(function(l){return login(l).toLowerCase()===wl.toLowerCase()})){
   var LZ=czytajJSON(LOG_KLUCZ,[]);if(!Array.isArray(LZ))LZ=[];var u2=navigator.userAgent;
   LZ.unshift({t:Date.now(),konto:'?',wpis:wl.slice(0,30),ip:null,urz:(/iPhone|iPad/.test(u2)?'iPhone/iPad':/Android/.test(u2)?'Telefon, Android':/Windows/.test(u2)?'Komputer, Windows':/Mac/.test(u2)?'Komputer, Mac':'Inne'),ok:false});piszJSON(LOG_KLUCZ,LZ.slice(0,200));
   var bl=$('#log-blad');if(bl){bl.hidden=false;bl.textContent='Nieprawidłowy login lub hasło. Ta próba zapisała się w Dzienniku logowań w Panelu Zarządu. W podglądzie można wejść przyciskiem poniżej.'}
   return}
  /* dziennik logowan: w podgladzie bez adresu IP (docelowo zapisuje go serwer) */
  var L=czytajJSON(LOG_KLUCZ,[]);if(!Array.isArray(L))L=[];
  var ua=navigator.userAgent,urz=(/iPhone|iPad/.test(ua)?'iPhone/iPad':/Android/.test(ua)?'Telefon, Android':/Windows/.test(ua)?'Komputer, Windows':/Mac/.test(ua)?'Komputer, Mac':'Inne')+(/Edg\//.test(ua)?', Edge':/Firefox/.test(ua)?', Firefox':/Chrome/.test(ua)?', Chrome':/Safari/.test(ua)?', Safari':'');
  L.unshift({t:Date.now(),konto:login(DEMO),ip:null,urz:urz,ok:true});piszJSON(LOG_KLUCZ,L.slice(0,200));
  log.hidden=true;app.hidden=false;scrollTo(0,0);$('#app h2').focus();if(/^#(informacje|ogloszenia)$/.test(location.hash))pokaz('ogloszenia',true);if(/^#(regulamin|dokumenty)$/.test(location.hash))pokaz('dokumenty',true)}
 var lp=$('#app .lokal-pas p');if(lp)lp.textContent=DEMO.wlasc?DEMO.wlasc:'Właściciel lokalu B1 (dane przykładowe)';
 $('#form-log').addEventListener('submit',wejdz);$('#demo-wejdz').addEventListener('click',wejdz);
 $('#wyloguj').addEventListener('click',function(){app.hidden=true;log.hidden=false;scrollTo(0,0)});
 var pokaz=zakladki(app);pokaz('pulpit');
 var N=nota(DEMO);
 $('#nota-biezaca').innerHTML=notaHTML(N);
 $('#pulpit-kwota').textContent=zl(N.suma)+' zł';
 /* historia: poprzednie miesiace */
 var hist=historia(DEMO),lista=$('#historia-lista');
 lista.innerHTML=histListaHTML(hist,0,'data-h');
 var hp=$('#historia-nota');hp.innerHTML=notaHTML(hist[0].n);
 lista.addEventListener('click',function(e){var b=e.target.closest('button[data-h]');if(!b)return;$$('button',lista).forEach(function(x){x.classList.toggle('akt',x===b)});hp.innerHTML=notaHTML(hist[+b.dataset.h].n);if(innerWidth<900)hp.scrollIntoView({behavior:'smooth',block:'start'})});
 $$('[data-druk]').forEach(function(b){b.addEventListener('click',function(){print()})});
 /* uchwaly: glos lokalu demo zapisuje sie w tej przegladarce i widzi go Zarzad w Panelu */
 var ul=$('#uch-lista');
 function rysujUch(){ul.innerHTML=UCH.lista.map(function(u){
  var moj=(UCH.glosy[u.id]||{})[klucz(DEMO)],h='<div class="uch"><span class="status'+(u.koniec?' zam':'')+'">'+(u.koniec?'Głosowanie zakończone '+data(u.koniec):'Głosowanie trwa do '+data(u.do))+'</span><h3>Uchwała nr '+esc(u.nr)+' '+esc(u.tytul)+'</h3><p>'+esc(u.opis||'')+'</p>';
  if(u.koniec){var R=wynik(u);h+=pasekHTML(R)+'<p class="uch-wyn"><b>'+(R.podjeta?'Uchwała podjęta.':'Uchwała niepodjęta.')+'</b> Wynik: '+wynikTxt(R)+' ('+(R.tryb==='udzialy'?'liczone udziałami':'jeden lokal, jeden głos')+').'+(moj?' Głos Państwa lokalu: '+GL_TXT[moj.g]+'.':'')+'</p>'}
  else{h+='<div class="glos" data-u="'+u.id+'">'+GLOSY.map(function(k){return '<button type="button" data-g="'+k+'" aria-pressed="'+!!(moj&&moj.g===k)+'">'+(k==='za'?'Za':k==='przeciw'?'Przeciw':'Wstrzymuję się')+'</button>'}).join('')+'</div><p class="glos-wynik"'+(moj?'':' hidden')+'>'+(moj?'Głos Państwa lokalu: '+GL_TXT[moj.g]+' ('+SP_TXT[moj.sp]+'). Do końca głosowania można go zmienić.':'')+'</p>'}
  return h+'</div>'}).join('')}
 rysujUch();
 ul.addEventListener('click',function(e){var b=e.target.closest('.glos button');if(!b)return;var u=b.parentNode.dataset.u;UCH=czytajJSON(UCH_KLUCZ,UCH);UCH.glosy[u]=UCH.glosy[u]||{};UCH.glosy[u][klucz(DEMO)]={g:b.dataset.g,sp:'strona',t:Date.now()};uchZapisz();rysujUch()});
}

/* ===== PANEL ZARZADU ===== */
function admin(){
 var root=$('#panel'),pokaz=zakladki(root);pokaz('oplaty');
 var tb=$('#ceny-tab tbody');
 function rysujCeny0(){
  tb.innerHTML=CENY.map(function(c,i){return '<tr><td>'+(i+1)+'</td><td><input aria-label="Nazwa opłaty '+(i+1)+'" data-nazwa="'+i+'" value="'+esc(c.nazwa)+'">'+(c.typ==='roczna'?'<label class="jedn"><input type="checkbox" data-jedn="'+i+'"'+(c.dolicz?' checked':'')+'> dolicz w nocie za '+MIES[OKRES.mies-1]+' '+OKRES.rok+'</label>':'')+'</td><td>'+esc(c.miara)+'</td><td><div class="cena-in"><input aria-label="Cena jednostkowa brutto pozycji '+(i+1)+'" type="text" inputmode="decimal" autocomplete="off" data-cena="'+i+'" value="'+c.cena.toFixed(2).replace('.',',')+'"><span>zł</span></div></td><td><button type="button" class="link usun" data-usun="'+i+'" aria-label="Usuń składnik '+esc(c.nazwa)+'">Usuń</button></td></tr>'}).join('');
 }
 function rysujJednor(){var b=$('#n-jednor');if(!b)return;b.innerHTML=CENY.map(function(c,i){return c.typ==='roczna'?'<label class="chk"><input type="checkbox" data-jedn="'+i+'"'+(c.dolicz?' checked':'')+'> Dolicz w tej nocie: '+esc(c.nazwa)+' ('+zl(c.cena)+' zł za lokal)</label>':''}).join('')}
 function rysujCeny(){rysujCeny0();rysujJednor()}
 rysujCeny();
 document.addEventListener('change',function(e){var t=e.target;if(!t.dataset||t.dataset.jedn===undefined)return;var c=CENY[+t.dataset.jedn];c.dolicz=t.checked;$$('[data-jedn="'+t.dataset.jedn+'"]').forEach(function(x){x.checked=t.checked});przelicz(true);zapiszCeny();stanCen();$('#ceny-info').textContent='„'+c.nazwa+'” '+(t.checked?'będzie doliczona':'nie będzie doliczona')+' w nocie za '+MIES[OKRES.mies-1]+' '+OKRES.rok+'.'});
 tb.addEventListener('click',function(e){
  var b=e.target.closest('[data-usun]');if(!b)return;
  if(!b.classList.contains('potw')){$$('.usun.potw',tb).forEach(function(x){x.classList.remove('potw');x.textContent='Usuń'});b.classList.add('potw');b.textContent='Potwierdź usunięcie';return}
  var c=CENY.splice(+b.dataset.usun,1)[0];rysujCeny();przelicz(true);zapiszCeny();stanCen();
  $('#ceny-info').textContent='Składnik „'+c.nazwa+'” usunięty: nie będzie go w kolejnych notach. Noty już wystawione zostają bez zmian.';
 });
 $('#form-skl').addEventListener('submit',function(e){
  e.preventDefault();var fs=e.target,nz=fs.nazwa.value.trim();if(!nz){fs.nazwa.focus();return}
  var typ=fs.typ.value,cena=parseFloat(String(fs.cena.value).replace(',','.'))||0;
  var ix=CENY.length;CENY.forEach(function(c,i){if(c.typ==='woda'||c.typ==='roczna'){if(ix===CENY.length)ix=i}});
  CENY.splice(ix,0,{nazwa:nz,typ:typ,cena:cena,miara:typ==='m2'?'m²':typ==='osoby'?'liczba osób':typ==='roczna'?'zł, jednorazowo':'zł',dolicz:typ==='roczna'?true:undefined});
  rysujCeny();przelicz(true);zapiszCeny();stanCen();fs.reset();
  $('#ceny-info').textContent=(typ==='roczna'?'Dodano opłatę jednorazową „'+nz+'”. Jest zaznaczona do noty za '+MIES[OKRES.mies-1]+' '+OKRES.rok+'; w kolejnych notach wystarczy odznaczyć pole „dolicz w nocie”.':'Dodano składnik „'+nz+'”. Pojawi się w notach wszystkich lokali.');
 });
 function odswiezPodglad(){var N=nota(DEMO);$('#podglad-noty').innerHTML=notaHTML(N,{mala:true})}
 function przelicz(blysk,bezWody){
  var SEL='#podglad-noty .kw,#podglad-noty [data-suma],#suma-wszystkich,#suma-a7';
  var przed=$$(SEL).map(function(e){return e.textContent});
  var N=nota(DEMO);$('#podglad-noty').innerHTML=notaHTML(N,{mala:true});
  var suma=0;LOKALE.forEach(function(l){suma+=nota(l).suma});
  $('#suma-wszystkich').textContent=zl(suma)+' zł';$('#suma-a7').textContent=zl(N.suma)+' zł';
  if(blysk){$$(SEL).forEach(function(e,i){if(przed[i]!==undefined&&przed[i]!==e.textContent){e.classList.remove('blysk');void e.offsetWidth;e.classList.add('blysk')}})}
  rysujLokale();if(!bezWody)rysujWode();
 }
 function cenaZPola(t){var x=String(t.value).replace(/\s/g,'').replace(',','.');if(!/^\d+(\.\d{0,2})?$/.test(x))return null;return Math.round(parseFloat(x)*100)/100}
 function stanCen(zPrzycisku){var b=$('#ceny-stan');if(!b)return;if(!CENY_ZAP){b.className='woda-stan';b.textContent='Ceny jak we wzorze noty.';return}b.className='woda-stan ok';b.textContent=(zPrzycisku?'Zapisano. ':'Zapisane. ')+'Ostatni zapis: '+godz(CENY_ZAP)+'. Noty wszystkich lokali, E-Kartoteki i Strefa mieszkańca liczą się już według tych cen.'}
 tb.addEventListener('input',function(e){var t=e.target;if(t.dataset.cena!==undefined){var v=cenaZPola(t);t.classList.toggle('zle',v===null);if(v!==null){CENY[+t.dataset.cena].cena=v;przelicz(true);zapiszCeny();stanCen()}}else if(t.dataset.nazwa!==undefined){CENY[+t.dataset.nazwa].nazwa=t.value||'Opłata';przelicz(false);zapiszCeny();stanCen()}});
 tb.addEventListener('change',function(e){var t=e.target;if(t.dataset.cena!==undefined){var v=cenaZPola(t);if(v!==null){t.value=v.toFixed(2).replace('.',',');t.classList.remove('zle')}}else if(t.dataset.nazwa!==undefined){rysujJednor()}});
 stanCen();
 $('#ceny-zapisz').addEventListener('click',function(){var b=$('#ceny-stan'),zle=$$('input.zle',tb);if(zle.length){b.className='woda-stan brak';b.textContent='Sprawdź cenę w zaznaczonym polu (liczba, np. 16,15). Pozostałe zmiany są zapisane.';zle[0].focus();return}rysujJednor();if(!zapiszCeny()){b.className='woda-stan brak';b.textContent='Ta przeglądarka nie pozwala zapisać danych (tryb prywatny). Zmiany działają do odświeżenia strony.';return}przelicz(false);stanCen(true);$('#ceny-info').textContent='Zapisane ceny: '+CENY.map(function(c){return c.nazwa+' '+zl(c.cena)+' zł'}).join('; ')+'.'});
 $('#ceny-wzor').addEventListener('click',function(){try{localStorage.removeItem(CENY_KLUCZ)}catch(e){}location.reload()});
 function garHTML(l,i){
  if(!l.gar.length)return '-';
  return l.gar.map(function(g,k){return '<div class="gar">'+liczba(g.m2,2)+' <label>nr <input aria-label="Numer miejsca w garażu, lokal '+l.nr+' blok '+l.bud+', garaż '+(k+1)+'" data-gar="'+i+'-'+k+'" value="'+esc(g.miejsce)+'" maxlength="14"></label></div>'}).join('');
 }
 /* E-Kartoteka lokalu rozwijana po kliknieciu wiersza: nota, historia not, edycja przez Zarzad, historia zmian */
 var OTW={},HSEL={},KOM={};
 var ETYK={wlasc:'Właściciel',os:'Liczba osób',odsetki:'Odsetki za nieterminowe wpłaty',celowe:'Wpłaty celowe z Uchwały',inne:'Wpłaty inne',niedop:'Niedopłata',nadp:'Nadpłata',wodaZero:'Woda w bieżącej nocie 0 zł',uwagi:'Uwagi do Noty'};
 var KWOTY=['odsetki','celowe','inne','niedop','nadp'];
 function wart(p,v){if(p==='wodaZero')return v?'tak':'nie';return KWOTY.indexOf(p)>=0?zl(+v||0)+' zł':(v===''||v==null?'(puste)':String(v))}
 function zmianyLok(l){var Z=czytajJSON(ZMIANY_KLUCZ,[]);if(!Array.isArray(Z))return [];return Z.filter(function(z){return z.lok===klucz(l)})}
 function ostatnieLog(l){var k=login(l),W=czytajJSON(LOG_KLUCZ,[]);if(!Array.isArray(W))W=[];var L=W.concat(typeof LOGP!=='undefined'&&LOGP?LOGP:[]),t=0;L.forEach(function(x){if(x.konto===k&&x.ok&&x.t>t)t=x.t});return t}
 function ostatnieTxt(l){if(l.tylkoG)return '';var t=ostatnieLog(l);return t?'ostatnie logowanie: '+godz(t):'jeszcze się nie logował'}
 function ostatnieKr(l){var t=ostatnieLog(l);if(!t)return 'jeszcze się nie logował';var d=new Date(t);return 'ostatnie logowanie: <br>'+godz(t).replace(', godz.',',')}
 function kartHTML(l,i){
  var H=historia(l),sel=HSEL[i]||0,n=H[sel]?H[sel].n:H[0].n,Z=zmianyLok(l);
  var pole=function(p,typ,extra){var v=l[p];return '<div class="pole"><label for="kf-'+p+'-'+i+'">'+ETYK[p]+(KWOTY.indexOf(p)>=0?' (zł)':'')+'</label>'+(typ==='area'?'<textarea id="kf-'+p+'-'+i+'" name="'+p+'" rows="2">'+esc(v)+'</textarea>':'<input id="kf-'+p+'-'+i+'" name="'+p+'" '+(typ==='txt'?'type="text" maxlength="80"':'type="text" inputmode="decimal" autocomplete="off"')+' value="'+(KWOTY.indexOf(p)>=0?(+v||0).toFixed(2).replace('.',','):esc(v))+'"'+(extra||'')+'>')+'</div>'};
  var t='<div class="kart-det"><div class="kart-gl"><h3>E-Kartoteka: lokal '+l.nr+', blok '+l.bud+'</h3><p>Tak samo widzi ją właściciel po zalogowaniu do Strefy mieszkańca.'+(l.tylkoG?'':' Właściciel: '+ostatnieTxt(l)+'.')+'</p><button type="button" class="link" data-zwin="'+i+'">Zwiń</button></div>';
  t+='<div class="kart-uklad"><div class="kart-nota">'+notaHTML(n,{mala:true})+'</div><div class="kart-bok">';
  t+='<form class="kart-form" id="kf-'+i+'" data-kf="'+i+'"><h4>Zmień dane w E-Kartotece</h4><p class="uwaga">Zmiany dotyczą bieżącej noty za '+MIES[OKRES.mies-1]+' '+OKRES.rok+'. Noty z historii zostają bez zmian.</p>';
  t+=pole('wlasc','txt',' placeholder="'+esc(wlascTxt(l))+'"');
  if(!l.tylkoG)t+=pole('os','num');
  t+='<div class="kart-2">'+pole('odsetki')+pole('celowe')+pole('inne')+pole('niedop')+pole('nadp')+'</div>';
  if(!l.tylkoG)t+='<label class="chk kart-chk"><input type="checkbox" name="wodaZero"'+(l.wodaZero?' checked':'')+'> <span>Woda w bieżącej nocie 0 zł (np. woda już opłacona przez właściciela)</span></label>';
  t+=pole('uwagi','area');
  t+='<button class="btn" type="submit">Zapisz zmiany</button><p class="info" aria-live="polite">'+(KOM[i]||'')+'</p></form>';
  t+='<h4 class="kart-h">Historia not</h4><ul class="kart-hist">'+histListaHTML(H,sel,'data-kh="'+i+'" data-kix')+'</ul>';
  t+='<h4>Historia zmian</h4>'+(Z.length?'<ul class="kart-zm">'+Z.slice(0,30).map(function(z){return '<li><time>'+godz(z.t)+'</time> '+esc(z.kto)+': '+esc(z.co)+'</li>'}).join('')+'</ul>':'<p class="uwaga">Brak zmian wprowadzonych przez Zarząd.</p>');
  t+='</div></div></div>';
  return t;
 }
 function rysujLokale(){
  var s=0;$('#lokale-tab tbody').innerHTML=LOKALE.map(function(l,i){var n=nota(l);s+=n.suma;var o=!!OTW[i];return '<tr class="wiersz'+(l===DEMO?' demo':'')+(o?' otw':'')+'" data-lok="'+i+'"><td><button type="button" class="rozw" data-rozw="'+i+'" aria-expanded="'+o+'" aria-controls="kart-'+i+'" aria-label="E-Kartoteka lokalu '+l.nr+' blok '+l.bud+'"><span aria-hidden="true">'+(o?'▾':'▸')+'</span></button> '+l.bud+'</td><td class="c-lok"><b>'+l.nr+'</b></td><td class="c-wl">'+esc(wlascTxt(l))+'</td><td class="l c-m2" data-l="m²">'+(l.m2?liczba(l.m2,2):'-')+'</td><td class="c-gar" data-l="garaż m² / nr">'+garHTML(l,i)+'</td><td class="l c-os" data-l="osoby">'+(l.tylkoG?'-':l.os)+'</td><td class="l c-nota" data-l="nota">'+zl(n.suma)+'</td><td class="c-konto"><span class="ok">aktywne</span>'+(l.tylkoG?'':'<small class="ost-log">'+ostatnieKr(l)+'</small>')+'<button type="button" class="link" data-edytuj="'+i+'">Zmień dane</button><button type="button" class="link" data-haslo="'+i+'">Nowe hasło</button></td></tr>'+(o?'<tr class="det" id="kart-'+i+'"><td colspan="8">'+kartHTML(l,i)+'</td></tr>':'')}).join('');
  $('#lokale-suma').textContent=zl(s)+' zł';
 }
 function odswiezKarte(i){var r=$('#kart-'+i+' .kart-nota');if(!r)return;var H=historia(LOKALE[i]);r.innerHTML=notaHTML(H[HSEL[i]||0].n,{mala:true})}
 var lt=$('#lokale-tab');
 lt.addEventListener('input',function(e){var t=e.target;if(!t.dataset.gar)return;var p=t.dataset.gar.split('-'),l=LOKALE[+p[0]];l.gar[+p[1]].miejsce=t.value.trim();zapiszLokale();if(l===DEMO)odswiezPodglad();odswiezKarte(+p[0])});
 lt.addEventListener('change',function(e){var t=e.target;if(!t.dataset.gar)return;var p=t.dataset.gar.split('-'),l=LOKALE[+p[0]],m=l.gar[+p[1]].miejsce;$('#lokale-info').textContent='Lokal '+l.nr+' (blok '+l.bud+'): '+(m?'zapisano numer miejsca w garażu „'+m+'”. W nocie tego lokalu jest teraz „Czynsz za miejsce w garażu, miejsce nr '+m+'”.':'usunięto numer miejsca w garażu.')});
 lt.addEventListener('click',function(e){
  var t=e.target;
  var zw=t.closest('[data-zwin]');if(zw){var iz=+zw.dataset.zwin;delete OTW[iz];rysujLokale();var bz=$('[data-rozw="'+iz+'"]');if(bz)bz.focus();return}
  var kh=t.closest('[data-kix]');if(kh){var ik=+kh.dataset.kh;HSEL[ik]=+kh.dataset.kix;$$('#kart-'+ik+' .kart-hist button').forEach(function(x){x.classList.toggle('akt',x===kh)});odswiezKarte(ik);return}
  if(t.closest('.det'))return;
  var ed=t.closest('[data-edytuj]');if(ed){var ie=+ed.dataset.edytuj;OTW[ie]=true;rysujLokale();var fe=$('#kf-'+ie);if(fe){fe.scrollIntoView({behavior:'smooth',block:'start'});var pe=fe.querySelector('input');if(pe)pe.focus({preventScroll:true})}return}
  if(t.closest('input,label,a,[data-haslo]'))return;
  var w=t.closest('tr.wiersz');if(!w)return;
  var i=+w.dataset.lok;if(OTW[i])delete OTW[i];else OTW[i]=true;rysujLokale();
  var b=$('[data-rozw="'+i+'"]');if(b)b.focus({preventScroll:true});
 });
 lt.addEventListener('submit',function(e){
  var f=e.target.closest('[data-kf]');if(!f)return;e.preventDefault();
  var i=+f.dataset.kf,l=LOKALE[i],nowe={},bledy=[];
  POLA_KART.forEach(function(p){
   var el=f.elements[p];if(!el)return;if(p==='wodaZero'){nowe[p]=!!el.checked;return}var v=el.value;
   if(KWOTY.indexOf(p)>=0){v=String(v).replace(/\s/g,'').replace(',','.');if(v==='')v='0';if(!/^\d+(\.\d{1,2})?$/.test(v)){bledy.push(ETYK[p]);return}nowe[p]=r2(parseFloat(v))}
   else if(p==='os'){v=String(v).trim();if(!/^\d{1,2}$/.test(v)){bledy.push(ETYK[p]);return}nowe[p]=+v}
   else nowe[p]=String(v).trim();
  });
  var info=$('.info',f);
  if(bledy.length){info.className='info blad';info.textContent='Popraw: '+bledy.join(', ')+' (kwota w zł, np. 12,50; liczba osób jako liczba całkowita).';return}
  var zm=[];POLA_KART.forEach(function(p){if(nowe[p]!==undefined&&nowe[p]!==l[p]){zm.push(ETYK[p]+': '+wart(p,l[p])+' → '+wart(p,nowe[p]));l[p]=nowe[p]}});
  if(!zm.length){info.className='info';info.textContent='Brak zmian do zapisania.';return}
  zapiszLokale();
  var Z=czytajJSON(ZMIANY_KLUCZ,[]);if(!Array.isArray(Z))Z=[];var teraz=Date.now();
  zm.forEach(function(c){Z.unshift({t:teraz,kto:'Zarząd (admin)',lok:klucz(l),co:c})});piszJSON(ZMIANY_KLUCZ,Z.slice(0,500));
  KOM[i]='Zapisano: '+zm.length+(zm.length===1?' zmiana':zm.length<5?' zmiany':' zmian')+'. Nota przeliczona, właściciel widzi ją w swojej E-Kartotece.';
  HSEL[i]=0;przelicz(true);KOM[i]='';
 });
 function cenaWody(){var c=CENY.filter(function(x){return x.typ==='woda'})[0];return c?c.cena:0}
 function wodaKomorki(l){
  var w=zuzycie(l),z,k;
  if(l.poprz==null||l.obecny==null){z='<span class="w-brak">uzupełnij oba stany</span>';k='-'}
  else if(l.obecny<l.poprz){z='<span class="w-zle">obecny mniejszy niż poprzedni</span>';k='-'}
  else{z=m3(w)+(w>WODA_DUZO?' <span class="w-uwaga">sprawdź</span>':'');k=zl(r2(w*cenaWody()))}
  return [z,k];
 }
 var WODA_DUZO=40;
 function poleWody(l,i,pole,opis){return '<input aria-label="'+opis+' wodomierza lokalu '+l.nr+' blok '+l.bud+'" type="text" inputmode="decimal" autocomplete="off" data-woda="'+i+'" data-pole="'+pole+'" value="'+(l[pole]==null?'':m3(l[pole]).replace(/\s/g,''))+'">'}
 function rysujWode(){
  $('#woda-tab tbody').innerHTML=LOKALE.map(function(l,i){if(l.tylkoG)return '';var c=wodaKomorki(l);return '<tr data-wiersz="'+i+'"><td data-l="Blok">'+l.bud+'</td><td data-l="Lokal"><b>'+l.nr+'</b></td><td class="l" data-l="Stan poprzedni m³">'+poleWody(l,i,'poprz','Stan poprzedni')+'</td><td class="l" data-l="Stan obecny m³">'+poleWody(l,i,'obecny','Stan obecny')+'</td><td class="l" data-l="Zużycie m³" data-z>'+c[0]+'</td><td class="l" data-l="Kwota za wodę zł" data-k>'+c[1]+'</td></tr>'}).join('');
  $('#woda-data').textContent=data(OKRES.odczyt);$('#woda-hp').textContent=data(OKRES.odczytPoprz);$('#woda-ho').textContent=data(OKRES.odczyt);
 }
 function czytajStan(v){v=String(v==null?'':v).replace(/[\s ]/g,'').replace(/m3|m³/gi,'').replace(',','.');if(v==='')return null;if(!/^\d+(\.\d+)?$/.test(v))return NaN;return Math.round(parseFloat(v)*1000)/1000}
 function zapiszWode(){try{var st={};LOKALE.forEach(function(l){if(!l.tylkoG)st[l.bud+'/'+l.nr]=[l.poprz,l.obecny]});localStorage.setItem(WODA_KLUCZ,JSON.stringify({stany:st,odczyt:OKRES.odczyt,odczytPoprz:OKRES.odczytPoprz,cykl:OKRES.cykl,zapisano:OKRES.zapisano}))}catch(e){}}
 /* cykl odczytow: co 2 miesiace (1. dzien miesiaca nieparzystego) albo co miesiac */
 function dodajMies(iso,n){var p=iso.split('-'),r=+p[0],m=+p[1]-1+n;r+=Math.floor(m/12);m=((m%12)+12)%12;return r+'-'+('0'+(m+1)).slice(-2)+'-01'}
 function nastOdczyt(){var n=dodajMies(OKRES.odczyt,1);if(OKRES.cykl==2&&(+n.split('-')[1])%2===0)n=dodajMies(n,1);return n}
 function kompletWody(){var w=0,b=0,z=0,suma=0;LOKALE.forEach(function(l){if(l.tylkoG)return;if(l.poprz==null||l.obecny==null)b++;else if(l.obecny<l.poprz)z++;else{w++;suma+=zuzycie(l)}});return {w:w,b:b,z:z,suma:Math.round(suma*1000)/1000,ile:w+b+z}}
 function stanWody(){
  var e=$('#woda-stan'),k=kompletWody();
  if(OKRES.zapisano){e.className='woda-stan ok';e.textContent='Odczyt z '+data(OKRES.odczyt)+' zapisany '+godz(OKRES.zapisano)+'. Uzupełnione lokale: '+k.w+' z '+k.ile+', zużycie razem '+m3(k.suma)+' m³.'+(k.b||k.z?' Uwaga: '+(k.b?k.b+' bez stanu':'')+(k.b&&k.z?', ':'')+(k.z?k.z+' z obecnym mniejszym niż poprzedni':'')+'.':'')}
  else{e.className='woda-stan brak';e.textContent='Odczyt z '+data(OKRES.odczyt)+' nie jest jeszcze zapisany. Uzupełnione lokale: '+k.w+' z '+k.ile+'. Po wpisaniu wszystkich stanów kliknij Zapisz odczyt.'}
  $('#woda-nast').textContent='Rozpocznij następny odczyt ('+data(nastOdczyt())+')';
  var fc=$('#form-cykl');fc.cykl.value=String(OKRES.cykl);fc.pop.value=OKRES.odczytPoprz;fc.ob.value=OKRES.odczyt;
  var no=$('#n-woda-opis');if(no)no.textContent='Dolicz wodę z odczytu '+data(OKRES.odczyt)+' (poprzedni '+data(OKRES.odczytPoprz)+')';
 }
 function zatwierdzWode(){
  var k=kompletWody(),info=$('#woda-info');
  if(k.b||k.z){
   var brak=[];LOKALE.forEach(function(l){if(!l.tylkoG&&(l.poprz==null||l.obecny==null||l.obecny<l.poprz))brak.push(l.bud+' '+l.nr)});
   if(!confirm('Nie wszystkie lokale mają poprawne stany ('+brak.join(', ')+'). Zapisać odczyt mimo to? Dla tych lokali woda w nocie wyniesie 0 zł.'))return;
  }
  OKRES.zapisano=Date.now();zapiszWode();stanWody();
  info.textContent='Zapisano odczyt z '+data(OKRES.odczyt)+'. Noty policzą wodę z tego odczytu.';
  $('#woda-stan').scrollIntoView({behavior:'smooth',block:'center'});
 }
 var wt=$('#woda-tab');
 wt.addEventListener('change',function(e){
  var t=e.target;if(t.dataset.woda===undefined)return;
  var l=LOKALE[+t.dataset.woda],pole=t.dataset.pole,v=czytajStan(t.value),info=$('#woda-info'),kto='Lokal '+l.nr+' (blok '+l.bud+'): ';
  if(isNaN(v)&&v!==null){t.value=l[pole]==null?'':m3(l[pole]).replace(/\s/g,'');info.textContent=kto+'wpisz sam stan licznika, np. 412 albo 412,345.';return}
  l[pole]=v;t.value=v==null?'':m3(v).replace(/\s/g,'');
  var tr=t.closest('tr'),c=wodaKomorki(l);tr.querySelector('[data-z]').innerHTML=c[0];tr.querySelector('[data-k]').innerHTML=c[1];
  if(l.poprz==null||l.obecny==null)info.textContent=kto+'zapisano. Uzupełnij '+(l.poprz==null?'stan poprzedni':'stan obecny')+', wtedy policzy się zużycie.';
  else if(l.obecny<l.poprz)info.textContent=kto+'stan obecny ('+m3(l.obecny)+') jest mniejszy niż poprzedni ('+m3(l.poprz)+'). Sprawdź odczyt, do czasu poprawki woda w nocie wynosi 0 zł.';
  else info.textContent=kto+'zapisano, zużycie '+m3(zuzycie(l))+' m³'+(zuzycie(l)>WODA_DUZO?' (dużo jak na jeden okres, sprawdź odczyt).':'.');
  OKRES.zapisano=null;zapiszWode();stanWody();przelicz(false,true);
 });
 wt.addEventListener('keydown',function(e){
  var t=e.target;if(e.key!=='Enter'||t.dataset.woda===undefined)return;e.preventDefault();
  var pola=$$('#woda-tab input[data-pole="'+t.dataset.pole+'"]'),ix=pola.indexOf(t);
  t.dispatchEvent(new Event('change',{bubbles:true}));
  if(pola[ix+1]){pola[ix+1].focus();pola[ix+1].select()}
 });
 $('#woda-import').addEventListener('click',function(){$('#woda-info').textContent='W docelowej stronie tutaj wczytuje się plik z odczytem zdalnym wodomierzy, a stany wpisują się same. W podglądzie stany wpisuje się ręcznie.'});
 /* nastepny odczyt: obecne stany przechodza do kolumny Poprzedni */
 $('#woda-nast').addEventListener('click',function(){
  var stare=OKRES.odczyt;
  if(!OKRES.zapisano&&!confirm('Odczyt z '+data(stare)+' nie jest zapisany. Mimo to przejść do następnego odczytu?'))return;
  LOKALE.forEach(function(l){if(!l.tylkoG){l.poprz=l.obecny;l.obecny=null}});
  OKRES.odczytPoprz=stare;OKRES.odczyt=nastOdczyt();OKRES.zapisano=null;
  zapiszWode();przelicz(false);stanWody();
  $('#woda-info').textContent='Stany z '+data(stare)+' przeszły do kolumny Poprzedni. Wystarczy wpisać nowe stany obecne (albo wczytać plik z odczytem zdalnym).';
 });
 $('#woda-zapisz').addEventListener('click',zatwierdzWode);$('#woda-zapisz2').addEventListener('click',zatwierdzWode);
 var fc=$('#form-cykl');
 fc.addEventListener('submit',function(e){e.preventDefault()});
 fc.addEventListener('change',function(e){
  var t=e.target;
  if(t.name==='cykl'){OKRES.cykl=+t.value;OKRES.odczytPoprz=dodajMies(OKRES.odczyt,-OKRES.cykl);$('#woda-info').textContent=OKRES.cykl==2?'Odczyty co 2 miesiące: 1 stycznia, 1 marca, 1 maja, 1 lipca, 1 września, 1 listopada.':'Odczyty co miesiąc: zawsze 1. dnia miesiąca.'}
  else if(t.name==='ob'&&t.value){OKRES.odczyt=t.value}
  else if(t.name==='pop'&&t.value){OKRES.odczytPoprz=t.value}
  OKRES.zapisano=null;zapiszWode();rysujWode();stanWody();
 });
 $('#woda-czysc').addEventListener('click',function(){
  LOKALE.forEach(function(l){if(!l.tylkoG){l.poprz=null;l.obecny=null}});OKRES.zapisano=null;zapiszWode();przelicz(false);stanWody();
  $('#woda-info').textContent='Stany wyczyszczone. Wpisz stan poprzedni i obecny dla każdego lokalu.';
  var p=$('#woda-tab input');if(p)p.focus();
 });
 $('#woda-przyklad').addEventListener('click',function(){try{localStorage.removeItem(WODA_KLUCZ)}catch(e){}location.reload()});
 /* noty */
 var f=$('#form-noty');
 f.addEventListener('submit',function(e){
  e.preventDefault();
  var mi=+f.mies.value;OKRES.mies=mi;var mm=('0'+mi).slice(-2),pm=('0'+(mi===1?12:mi-1)).slice(-2);
  OKRES.wyst=f.wyst.value;OKRES.platnosc=f.plat.value;OKRES.odsetkiOd=f.ods.value;OKRES.bezWody=!f.woda.checked;
  OKRES.celowe=parseFloat(String(f.celowe.value).replace(',','.'))||0;rysujCeny();
  var s=0,rows=LOKALE.map(function(l,i){var n=nota(l);s+=n.suma;return '<tr><td>'+l.bud+'</td><td><b>'+l.nr+'</b></td><td class="l">'+zl(n.suma)+'</td><td><button type="button" class="link" data-pokaz="'+i+'">Pokaż notę</button></td></tr>'}).join('');
  $('#noty-wynik').hidden=false;
  $('#noty-podsum').textContent='Wygenerowano 29 not za '+MIES[mi-1]+' 2026'+(OKRES.bezWody?' (bez wody, w tym miesiącu nie było odczytu)':', woda z odczytu '+data(OKRES.odczyt))+'. Suma należności: '+zl(s)+' zł. Właściciele zobaczą swoje noty po zalogowaniu.';
  $('#noty-tab tbody').innerHTML=rows;$('#noty-jedna').innerHTML='';
  przelicz(false);
  $('#noty-podsum').focus();
 });
 $('#noty-tab').addEventListener('click',function(e){var b=e.target.closest('[data-pokaz]');if(!b)return;var j=$('#noty-jedna');j.innerHTML=notaHTML(nota(LOKALE[+b.dataset.pokaz]));j.scrollIntoView({behavior:'smooth',block:'start'})});
 /* ogloszenia */
 var fo=$('#form-ogl');
 fo.addEventListener('submit',function(e){e.preventDefault();var t=fo.tytul.value.trim();if(!t){fo.tytul.focus();return}var li=document.createElement('li');li.innerHTML='<b>'+esc(t)+'</b><span>'+(fo.stala.checked?'informacja stała':'nowa informacja')+', dodano dziś</span>';$('#ogl-lista').prepend(li);fo.reset();$('#ogl-info').textContent='Ogłoszenie widzą teraz wszyscy mieszkańcy w Strefie mieszkańca (w podglądzie tylko na tej stronie).'});
 /* kalkulator odsetek: kwota x stopa x dni / 365 */
 var fk=$('#form-kalk');
 function kalk(){
  var kw=parseFloat(String(fk.kwota.value).replace(',','.'))||0,st=parseFloat(String(fk.stopa.value).replace(',','.'))||0;
  var t=Date.parse(fk.termin.value),z=Date.parse(fk.zaplata.value),dni=(isNaN(t)||isNaN(z))?0:Math.max(0,Math.round((z-t)/864e5));
  var o=Math.round(kw*st/100*dni/365*100)/100;
  $('#k-dni').textContent=dni;$('#k-ods').textContent=zl(o)+' zł';$('#k-raz').textContent=zl(kw+o)+' zł';
  $('#k-wzor').textContent=dni?zl(kw)+' zł × '+liczba(st,2)+'% × '+dni+' dni / 365 = '+zl(o)+' zł. Odsetki liczone od dnia po terminie płatności do dnia zapłaty włącznie.':'Zapłata w terminie, odsetki nie przysługują.';
 }
 f.mies.addEventListener('change',function(){var mi=+f.mies.value;f.woda.checked=!(OKRES.cykl==2&&mi%2===0)});
 fk.addEventListener('input',kalk);fk.addEventListener('submit',function(e){e.preventDefault()});kalk();
 /* nowe haslo dla lokalu */
 $('#lokale-tab').addEventListener('click',function(e){var b=e.target.closest('[data-haslo]');if(!b)return;var l=LOKALE[+b.dataset.haslo];b.outerHTML='<b class="ok haslo-zm">hasło zmienione</b>';$('#lokale-info').textContent='Lokal '+l.nr+' (blok '+l.bud+'): nadano nowe hasło. Poprzednie przestało działać, a nowe Zarząd przekazuje właścicielowi (w podglądzie nic nie jest zapisywane).'});
 /* dziennik logowan: wpisy przykladowe + wejscia do demo Strefy w tej przegladarce */
 var IPS=['83.27.141.92','89.64.12.207','178.36.201.18','31.0.124.66','188.146.92.31','37.47.210.5','5.173.40.112','46.205.198.77','83.11.250.140','91.150.177.23'];
 var URZ=['Telefon, Android, Chrome','Komputer, Windows, Edge','Komputer, Windows, Chrome','iPhone, Safari','Tablet, Android, Chrome','Komputer, Mac, Safari'];
 var LOGP=(function(){var s=11,r=function(){s=(s*16807)%2147483647;return (s-1)/2147483646},out=[],t=Date.now()-25*6e4,kont=LOKALE.filter(function(l){return !l.tylkoG});
  for(var k=0;k<34;k++){var zarz=r()<.18,l=kont[Math.floor(r()*kont.length)],ix=Math.floor(r()*IPS.length);out.push({t:t,konto:zarz?'zarzad':login(l),ip:IPS[zarz?0:ix],urz:URZ[zarz?1:Math.floor(r()*URZ.length)],ok:r()>.12});t-=Math.round((2+r()*20)*36e5)}
  [[20,'61-A9','31.0.124.66','Telefon, Android, Chrome'],[9,'kilinskiego61','185.220.101.7','Komputer, Windows, Chrome'],[3,'admin','45.141.84.12','Komputer, Linux, Firefox']].forEach(function(o){var x=out[o[0]];out.splice(o[0],0,{t:x.t+9e5,konto:'?',wpis:o[1],ip:o[2],urz:o[3],ok:false})});
  return out})();
 function kontoTxt(k,x){if(k==='zarzad')return 'Zarząd (admin)';if(k==='?')return 'nieznany login „'+esc(x&&x.wpis||'')+'”';var p=k.split('-');return 'Lokal '+p[1]+', blok '+p[0]}
 var flog=$('#form-logf');
 if(flog){
  flog.konto.innerHTML='<option value="">wszystkie konta</option><option value="zarzad">Zarząd (admin)</option><option value="?">nieznane loginy (obce próby)</option>'+LOKALE.filter(function(l){return !l.tylkoG}).map(function(l){return '<option value="'+login(l)+'">Lokal '+l.nr+', blok '+l.bud+'</option>'}).join('');
  var rysujLog=function(){
   var W=czytajJSON(LOG_KLUCZ,[]);if(!Array.isArray(W))W=[];
   var L=W.map(function(x){return Object.assign({wl:true},x)}).concat(LOGP),fk=flog.konto.value,fw=flog.wynik.value;
   L=L.filter(function(x){return (!fk||x.konto===fk)&&(!fw||(fw==='ok')===!!x.ok)});
   $('#log-tab tbody').innerHTML=L.length?L.map(function(x){return '<tr><td data-l="Data i godzina">'+godz(x.t)+'</td><td data-l="Konto">'+kontoTxt(x.konto,x)+'</td><td data-l="Adres IP">'+(x.ip?x.ip:'<span class="w-brak">podgląd bez serwera</span>')+'</td><td data-l="Urządzenie">'+esc(x.urz||'')+'</td><td data-l="Wynik">'+(x.ok?'<span class="ok">udane</span>':'<span class="w-zle">nieudane ('+(x.konto==='?'?'nie ma takiego konta':'błędne hasło')+')</span>')+'</td></tr>'}).join(''):'<tr><td colspan="5">Brak logowań dla wybranych filtrów.</td></tr>';
   $('#log-ile').textContent='Wpisów: '+L.length+'.';
  };
  flog.addEventListener('change',rysujLog);flog.addEventListener('submit',function(e){e.preventDefault()});
  $$('[data-tab="log"]').forEach(function(b){b.addEventListener('click',rysujLog)});
  rysujLog();
 }
 przelicz(false);stanWody();

 /* ===== uchwaly i glosowanie (Zarzad) ===== */
 (function(){
  var box=$('#uch-adm'),fg=$('#form-glos'),fu=$('#form-uch'),inf=$('#uch-info');
  if(!box)return;
  function opcjeLok(){return glosujacy().map(function(l){return '<option value="'+klucz(l)+'">'+l.bud+' / '+l.nr+' ('+esc(wlascTxt(l))+')</option>'}).join('')}
  function rysuj(otwarte){
   $$('input[name="tryb"]').forEach(function(x){x.checked=x.value===UCH.tryb});
   fg.uch.innerHTML=UCH.lista.filter(function(u){return !u.koniec}).map(function(u){return '<option value="'+u.id+'">Uchwała nr '+esc(u.nr)+'</option>'}).join('')||'<option value="">brak trwających głosowań</option>';
   box.innerHTML=UCH.lista.map(function(u){
    var R=wynik(u),g=UCH.glosy[u.id]||{},otw=otwarte===u.id;
    var wiersze=glosujacy().map(function(l){var v=g[klucz(l)];return '<tr'+(v?'':' class="brak"')+'><td>'+l.bud+' / '+l.nr+'</td><td>'+esc(wlascTxt(l))+'</td><td class="l">'+liczba(udzial(l)*100,2)+'%</td><td>'+(v?'<b class="g-'+v.g+'">'+GL_TXT[v.g]+'</b>':'nie głosował')+'</td><td>'+(v?SP_TXT[v.sp]:'')+'</td><td>'+(v&&!u.koniec&&v.sp!=='strona'?'<button class="btn ramka mini" type="button" data-cofnij="'+u.id+'|'+klucz(l)+'">Usuń głos</button>':'')+'</td></tr>'}).join('');
    return '<article class="uch uch-z"><span class="status'+(u.koniec?' zam':'')+'">'+(u.koniec?'Głosowanie zakończone '+data(u.koniec)+', wynik widzą właściciele w Strefie':'Głosowanie trwa do '+data(u.do))+'</span><h3>Uchwała nr '+esc(u.nr)+' '+esc(u.tytul)+'</h3>'+pasekHTML(R)+'<p class="uch-wyn"><b>'+(u.koniec?(R.podjeta?'Podjęta.':'Niepodjęta.'):(R.podjeta?'Na teraz: większość za.':'Na teraz: brak większości za.'))+'</b> '+wynikTxt(R)+'. Zagłosowało '+R.ile+' z '+R.razem+' lokali.</p><div class="akcje"><button class="btn ramka" type="button" data-rozwin="'+u.id+'" aria-expanded="'+otw+'">'+(otw?'Zwiń listę':'Lista lokali i głosów')+'</button>'+(u.koniec?'':'<button class="btn" type="button" data-koniec="'+u.id+'">Zakończ głosowanie</button>')+'</div><div class="przew" data-lista="'+u.id+'"'+(otw?'':' hidden')+'><table class="lista uch-tab"><thead><tr><th>Lokal</th><th>Właściciel</th><th class="l">Udział</th><th>Głos</th><th>Sposób</th><th></th></tr></thead><tbody>'+wiersze+'</tbody></table></div></article>'}).join('')}
  fg.lokal.innerHTML=opcjeLok();
  rysuj();
  document.addEventListener('change',function(e){if(e.target.name!=='tryb')return;UCH.tryb=e.target.value;uchZapisz();rysuj();inf.textContent=UCH.tryb==='udzialy'?'Głosy liczone są teraz udziałami.':'Głosy liczone są teraz według zasady jeden lokal, jeden głos.'});
  box.addEventListener('click',function(e){
   var b=e.target.closest('button');if(!b)return;
   if(b.dataset.rozwin){var t=$('[data-lista="'+b.dataset.rozwin+'"]',box),o=t.hidden;t.hidden=!o;b.setAttribute('aria-expanded',o);b.textContent=o?'Zwiń listę':'Lista lokali i głosów';return}
   if(b.dataset.koniec){if(!b.classList.contains('potw')){b.classList.add('potw');b.textContent='Potwierdź: zakończ i pokaż wynik mieszkańcom';return}var u=UCH.lista.filter(function(x){return x.id===b.dataset.koniec})[0];var d=new Date();u.koniec=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);uchZapisz();rysuj();inf.textContent='Głosowanie nad uchwałą nr '+u.nr+' zakończone. Wynik widzą teraz właściciele w Strefie mieszkańca.';return}
   if(b.dataset.cofnij){var p=b.dataset.cofnij.split('|');delete UCH.glosy[p[0]][p[1]];uchZapisz();rysuj(p[0]);inf.textContent='Głos lokalu '+p[1].replace('/',' / ')+' usunięty.'}
  });
  fg.addEventListener('submit',function(e){e.preventDefault();var u=fg.uch.value;if(!u)return;UCH.glosy[u]=UCH.glosy[u]||{};UCH.glosy[u][fg.lokal.value]={g:fg.glos.value,sp:fg.sposob.value,t:Date.now()};uchZapisz();rysuj(u);var ux=UCH.lista.filter(function(x){return x.id===u})[0];inf.textContent='Dopisano głos lokalu '+fg.lokal.value.replace('/',' / ')+' ('+GL_TXT[fg.glos.value]+', '+SP_TXT[fg.sposob.value]+') do uchwały nr '+ux.nr+'. Wynik przeliczony.';inf.scrollIntoView({behavior:'smooth',block:'center'})});
  fu.addEventListener('submit',function(e){e.preventDefault();var nr=fu.nr.value.trim(),t=fu.tytul.value.trim();if(!nr){fu.nr.focus();return}if(!t){fu.tytul.focus();return}var id='u'+Date.now();UCH.lista.unshift({id:id,nr:nr,tytul:t,opis:fu.opis.value.trim(),do:fu.do.value||'2026-12-31',koniec:null});UCH.glosy[id]={};uchZapisz();fu.reset();rysuj();inf.textContent='Uchwała nr '+nr+' dodana. Właściciele mogą już głosować w Strefie mieszkańca.';inf.scrollIntoView({behavior:'smooth',block:'center'})});
  $('#uch-reset').addEventListener('click',function(){UCH=uchStart();uchZapisz();rysuj();inf.textContent='Przywrócono przykładowe uchwały i głosy.'});
 })();

}

var pg=document.body.dataset.page;
if(pg==='strefa')strefa();if(pg==='admin')admin();
})();
