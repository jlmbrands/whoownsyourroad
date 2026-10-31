const CLASSES = [
  ["concession","Private concession (tolls to investors)","--road-conc"],
  ["toll_authority","Public toll authority","--road-auth"],
  ["state_toll","State toll / managed lanes","--road-stoll"],
  ["state","State DOT, free","--road-state"],
  ["federal","Federal","--road-federal"],
  ["county","County","--road-county"],
  ["city","City street","--road-city"],
  ["private","Privately owned","--road-private"],
  ["town","Town / township","--road-county"],
  ["park","Park agency","--road-federal"],
  ["tribal","Tribal nation","--road-federal"],
  ["other","Other public","--road-county"],
];
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const colorExpr = () => ["match",["get","owner_class"], ...CLASSES.flatMap(([k,,v])=>[k,css(v)]), css("--road-county")];
let stats={}, concessions=[];
// Some states encode route names oddly in HPMS (Arizona: "~~I~040~~~~"). Make them readable.
function prettyName(n){ n=(n==null||n==="nan")?"":String(n).trim(); if(!n) return "Unnamed road";
  const m=n.match(/^~*([A-Z])~(\d+)~/); if(m){ const t={I:"I-",U:"US ",S:"SR ",B:"Bus ",C:"CR "}[m[1]]||""; return t+String(Number(m[2])); }
  n=n.replace(/~+/g," ").replace(/\s+/g," ").trim();
  return n.replace(/^INTERSTATE (\d+)/i,"I-$1").replace(/^US HIGHWAY (\d+)/i,"US $1").replace(/^STATE (?:HIGHWAY|ROUTE) (\d+)/i,"SR $1") || "Unnamed road"; }
const fmt = n => n==null||isNaN(n) ? "–" : Number(n).toLocaleString("en-US");

const map = new maplibregl.Map({
  container:"map", center:[-96.5,38.5], zoom:4.1, minZoom:3.5, maxZoom:16,
  style:{version:8, sources:{}, layers:[{id:"bg",type:"background",paint:{"background-color":css("--bg")}}]},
  attributionControl:false
});

map.on("load", async () => {
  const [st, cons] = await Promise.all([fetch("data/stats.json").then(r=>r.json()), fetch("data/concessions.json").then(r=>r.json())]);
  stats = st; concessions = cons;
  map.addSource("counties",{type:"geojson",data:"data/us_counties.geojson"});
  map.addLayer({id:"counties",type:"line",source:"counties",minzoom:6,paint:{"line-color":css("--county-line"),"line-width":0.8}});
  map.addSource("states",{type:"geojson",data:"data/us_states.geojson"});
  map.addLayer({id:"states",type:"line",source:"states",paint:{"line-color":css("--road-county"),"line-width":["interpolate",["linear"],["zoom"],4,0.6,8,1.4],"line-opacity":0.8}});
  map.addSource("sel",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
  const W = location.search.includes("hero") ? 2.2 : 1;   // ?hero=1 renders bolder lines for the home-page poster image
  const widthPublic = ["interpolate",["linear"],["zoom"],4,0.5*W,6,0.8*W,10,1.2*W,14,3];
  const widthToll = ["interpolate",["linear"],["zoom"],4,1.6*W,6,2*W,10,2.6*W,14,5];
  let mode = "tiles";
  let MANIFEST = "data/parts_us/manifest.json";   // resolved below: the artifact host carries manifest.artifact.json (.wasm names), a normal deploy carries manifest.json
  async function addRoadLayers(){
    if (mode==="tiles"){
      // partitions keep every archive under the host's per-file cap; each is a sparse PMTiles for one zoom band and x-range
      const parts = await fetch(MANIFEST).then(r=>r.json());
      const topZ = Math.max(...parts.map(p=>p.maxzoom));
      for (const [i,pt] of parts.entries()){
        const sid="roads"+i, abs=new URL(pt.file, location.href).href;
        if (window.__pm) window.__pm.add(new pmtiles.PMTiles(new BufferSource(abs)));
        map.addSource(sid,{type:"vector",url:"pmtiles://"+abs, minzoom:pt.minzoom, maxzoom:pt.maxzoom, bounds:pt.bounds||[-180,-85,180,85]});
        const zmin = pt.minzoom, zmax = pt.maxzoom>=topZ ? 24 : pt.maxzoom+1;   // low bands hide once hi bands take over; the top band overzooms
        const L=(id,layer,extra)=>map.addLayer(Object.assign({id:id+"-"+i,type:"line",source:sid,"source-layer":layer,minzoom:zmin,maxzoom:zmax},extra),"sel");
        L("city","city",{paint:{"line-color":css("--road-city"),"line-width":["interpolate",["linear"],["zoom"],11,0.4,15,2]}});
        L("county","county",{paint:{"line-color":css("--road-county"),"line-width":["interpolate",["linear"],["zoom"],9,0.4,14,2.5]}});
        L("other","other",{paint:{"line-color":colorExpr(),"line-width":widthPublic}});
        L("public","state",{paint:{"line-color":colorExpr(),"line-width":widthPublic}});
        L("toll-glow","toll",{paint:{"line-color":colorExpr(),"line-width":["interpolate",["linear"],["zoom"],4,5,6,6,12,10],"line-opacity":0.22,"line-blur":4}});
        L("toll","toll",{paint:{"line-color":colorExpr(),"line-width":widthToll}});
      }
    } else {
      map.addSource("toll",{type:"geojson",data:"data/tx_toll.geojson"});
      map.addLayer({id:"toll-glow",type:"line",source:"toll",paint:{"line-color":colorExpr(),"line-width":["interpolate",["linear"],["zoom"],6,3,12,10],"line-opacity":0.18,"line-blur":4}},"sel");
      map.addLayer({id:"toll",type:"line",source:"toll",paint:{"line-color":colorExpr(),"line-width":widthToll}},"sel");
      document.getElementById("hint").textContent="Road tiles unavailable on this host; showing Texas toll roads only.";
    }
    const clickable = map.getStyle().layers.map(l=>l.id).filter(id=>/^(toll|public|other|county|city)(-\d+)?$/.test(id));
    for (const id of clickable) {
      map.on("click", id, e => { showFeature(e.features[0]); nudge(e.lngLat); });
      map.on("mouseenter", id, ()=>map.getCanvas().style.cursor="pointer");
      map.on("mouseleave", id, ()=>map.getCanvas().style.cursor="");
    }
  }
  map.addLayer({id:"sel",type:"line",source:"sel",paint:{"line-color":css("--fg"),"line-width":6,"line-opacity":.9}});
  // probe Range support on the tile archive; fall back to GeoJSON if the host ignores Range headers
  let rangeOK = false;
  const DBG=[]; const dbg=m=>{ DBG.push(m); if (DBG.length>8) DBG.shift(); const l=document.getElementById("loading"); l.innerHTML="Loading roads…<br><small style='opacity:.7'>"+DBG.join("<br>")+"</small>"; };
  window.addEventListener("error", e=>dbg("js: "+(e.message||e.type)));
  window.addEventListener("unhandledrejection", e=>dbg("promise: "+(e.reason&&e.reason.message||e.reason)));
  map.on("error", e=>dbg("map: "+((e.error&&e.error.message)||JSON.stringify(e).slice(0,120))));
  try { let r = await fetch("data/parts_us/manifest.artifact.json"); if (r.ok) MANIFEST="data/parts_us/manifest.artifact.json"; else r = await fetch(MANIFEST); if (!r.ok) throw new Error("manifest "+r.status); const m = await r.json(); const r2 = await fetch(m[0].file,{headers:{Range:"bytes=0-127"}}); rangeOK = r2.status===206 || (r2.headers.get("content-range")||"").startsWith("bytes 0-127");
    dbg(`probe ${m[0].file}: status ${r2.status}, content-range ${r2.headers.get("content-range")}, length ${r2.headers.get("content-length")}, encoding ${r2.headers.get("content-encoding")} → ${rangeOK?"range mode":"buffer mode"}`); } catch(e){ dbg("probe failed: "+e.message); }
  // Without Range support each partition is fetched whole (6-13 MB) the first time the map needs it, then served from memory.
  // The first 16 KB (header + root directory) ships as a separate .head file so the full partition only downloads when a tile in it is needed.
  class BufferSource { constructor(url){ this.url=url; this.buf=null; this.head=null; } getKey(){ return this.url; }
    async getBytes(offset,length){
      const get = u => fetch(u).then(r=>{ if(!r.ok) throw new Error(r.status+" "+u); return r.arrayBuffer(); }).then(b=>{ dbg(`got ${u.split("/").pop()} ${b.byteLength} bytes`); return b; }, e=>{ dbg("fetch error "+e.message); throw e; });
      if (!this.buf && offset+length<=16384) { this.head = this.head || get(this.url.replace(/\.wasm$/,".head.wasm")); const h = await this.head; return {data: h.slice(offset, offset+length)}; }
      this.buf = this.buf || get(this.url); const b = await this.buf; return {data: b.slice(offset, offset+length)}; } }
  if (MANIFEST.includes("artifact")) { rangeOK=false; dbg("artifact host: buffer mode"); }   // the artifact host answers 206 to the probe but drops content-length on real range reads
  if (window.pmtiles) {
    const proto = new pmtiles.Protocol();
    if (!rangeOK) { window.__pm = proto; }
    maplibregl.addProtocol("pmtiles", proto.tile);
  } else { mode="geojson"; }
  await addRoadLayers();
  const pins={type:"FeatureCollection",features:concessions.filter(c=>c.pin).map(c=>({type:"Feature",properties:{id:c.id,type:c.type,name:c.name},geometry:{type:"Point",coordinates:c.pin}}))};
  map.addSource("pins",{type:"geojson",data:pins});
  map.addLayer({id:"pins",type:"circle",source:"pins",paint:{"circle-radius":["interpolate",["linear"],["zoom"],4,4,10,8],"circle-color":["match",["get","type"],"revenue-concession",css("--road-conc"),"privately-owned-outright",css("--road-private"),css("--road-stoll")],"circle-stroke-color":css("--bg"),"circle-stroke-width":1.5}});
  map.on("click","pins",e=>{ const c=concessions.find(x=>x.id===e.features[0].properties.id); if(c){ showConcession(c); nudge(e.lngLat); } });
  map.on("mouseenter","pins",()=>map.getCanvas().style.cursor="pointer"); map.on("mouseleave","pins",()=>map.getCanvas().style.cursor="");
  buildLegend(); buildIndex();
  if (location.search.includes("deals=1")) document.getElementById("idx-btn").click();
  let idles=0;
  map.on("idle", ()=>{ idles++; const n = map.queryRenderedFeatures().filter(f=>String(f.source).startsWith("roads")).length;
    if (n>0 || idles>6) document.getElementById("loading").hidden = true; else dbg(`idle #${idles}: 0 road features drawn, mode=${mode}, sources=${Object.keys(map.getStyle().sources).filter(k=>k.startsWith("roads")).length}`); });
  // Deep links: #c-<deal id> opens a dossier, #s-TX fits a state, #@lon,lat,zoom goes to a spot
  const statesGeo = await fetch("data/us_states.geojson").then(r=>r.json());
  const openHash=()=>{ const h=location.hash;
    if (h.startsWith("#c-")) { const c=concessions.find(x=>x.id===h.slice(3)); if(c) showConcession(c); }
    else if (h.startsWith("#s-")) { const code=h.slice(3).toUpperCase(); const f=statesGeo.features.find(f=>(f.properties.STUSPS||f.properties.abbr||f.properties.state)===code); if(!f) return;
      let b=[180,90,-180,-90]; const walk=c=>{ if(typeof c[0]==="number"){ b=[Math.min(b[0],c[0]),Math.min(b[1],c[1]),Math.max(b[2],c[0]),Math.max(b[3],c[1])]; } else c.forEach(walk); }; walk(f.geometry.coordinates);
      map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:40,duration:0}); }
    else if (h.startsWith("#@")) { const [lon,lat,z]=h.slice(2).split(",").map(Number); if(isFinite(lon)&&isFinite(lat)) map.jumpTo({center:[lon,lat],zoom:isFinite(z)?z:9}); } };
  openHash(); window.addEventListener("hashchange", openHash);
  if (location.search.includes("bare")) document.body.classList.add("bare");
});

function buildLegend(){
  const n = document.getElementById("legend"); n.innerHTML="";
  for (const [k,label,v] of CLASSES){
    const b=document.createElement("button"); b.setAttribute("aria-pressed","true"); b.dataset.k=k;
    b.innerHTML=`<i style="background:${css(v)}"></i><span>${label}</span><span class="mi">${fmt(Math.round(stats.owner_miles?.[k]||0))} mi</span>`;
    b.onclick=()=>{ const on=b.getAttribute("aria-pressed")!=="true"; b.setAttribute("aria-pressed",on); applyFilter(); };
    n.appendChild(b);
  }
}
function applyFilter(){
  const off=[...document.querySelectorAll("#legend button[aria-pressed='false']")].map(b=>b.dataset.k);
  const f = off.length ? ["!",["in",["get","owner_class"],["literal",off]]] : null;
  for (const l of map.getStyle().layers) if (/^(toll|toll-glow|public|other|county|city)(-\d+)?$/.test(l.id)) map.setFilter(l.id,f);
}

function showFeature(f){
  const p=f.properties; map.getSource("sel").setData({type:"FeatureCollection",features:[f]});
  const c = p.concession_id ? concessions.find(x=>x.id===p.concession_id) : null;
  if (c) return showConcession(c, p);
  const cls = CLASSES.find(x=>x[0]===p.owner_class)||CLASSES[5];
  const name = prettyName(p.name || p.route || p.street);
  document.getElementById("rail-body").innerHTML = `
    <p class="eyebrow" style="--cls:${css(cls[2])}"><b>■ ${cls[1]}</b></p>
    <h2>${esc(name)}</h2>
    <p class="sub">${esc(p.toll_name||"")}${p.county?` · ${esc(p.county)} County`:""}</p>
    <dl class="kv">
      <dt>Owner</dt><dd>${esc(p.owner_name||"–")}</dd>
      <dt>Maintained by</dt><dd>${esc(p.maint_name||p.owner_name||"–")}</dd>
      <dt>Length here</dt><dd>${fmt(p.miles)} mi</dd>
      <dt>Daily traffic</dt><dd>${fmt(p.adt)} vehicles</dd>
    </dl>
    <p class="srcs">Source: TxDOT Roadway Inventory, year-end 2025. "Owner" is TxDOT's administrative-system code. This road has no private concession on record.</p>`;
  openRail(); location.hash="";
}

function showConcession(c, p){
  const s = stats.concessions?.[c.id]||{};
  const owners = (c.equity_owners||[]).map(o=>`<li><span>${esc(o.name)}${o.country?` <small>(${esc(o.country)})</small>`:""}</span><span>${o.share_pct!=null?o.share_pct+"%":""}</span></li>`).join("");
  document.getElementById("rail-body").innerHTML = `
    <p class="eyebrow" style="--cls:${css(TYPE_COLOR[c.type]||"--road-conc")}"><b>■ ${esc(TYPE_LABEL[c.type]||"Private concession")}${c.state?" · "+esc(c.state):""}</b></p>
    <h2>${esc(c.name)}</h2>
    <p class="sub">${esc(c.limits||(c.roads||[]).join(", "))}</p>
    ${c.type==="availability"?`<p class="sub">The public keeps the tolls here; a private company built it and is paid a fixed annual amount by the state.</p>`:""}
    <div class="stat">
      <div><b>${c.concession_ends||"–"}</b><span>contract ends</span></div>
      <div><b>${c.term_years?c.term_years+" yr":"–"}</b><span>term</span></div>
      <div><b>${fmt(Math.round(s.adt||0))}</b><span>avg daily vehicles</span></div>
    </div>
    ${c.revenue_latest?`<div class="stat">
      <div><b>$${Math.round(c.revenue_latest.usd/1e6)}M</b><span>revenue, ${c.revenue_latest.year}</span></div>
      <div><b>${c.dividends_latest_usd?"$"+Math.round(c.dividends_latest_usd/1e6)+"M":"–"}</b><span>paid to owners, ${c.revenue_latest.year}</span></div>
      <div><b>${c.dividends_cumulative_usd?(c.dividends_cumulative_usd>=1e9?"$"+(c.dividends_cumulative_usd/1e9).toFixed(2)+"B":"$"+Math.round(c.dividends_cumulative_usd/1e6)+"M"):(c.private_investment_usd?"$"+(c.private_investment_usd/1e9).toFixed(1)+"B":"–")}</b><span>${c.dividends_cumulative_usd?"paid to owners since opening":"private investment"}</span></div>
    </div>`:""}
    ${!c.revenue_latest&&(c.upfront_payment_usd||c.private_investment_usd)?`<div class="stat">
      <div><b>${c.upfront_payment_usd?"$"+(c.upfront_payment_usd/1e9).toFixed(c.upfront_payment_usd>=1e10?0:1)+"B":"–"}</b><span>paid to the state up front</span></div>
      <div><b>${c.private_investment_usd?"$"+(c.private_investment_usd/1e9).toFixed(1)+"B":"–"}</b><span>private investment</span></div>
      <div><b>${c.public_contribution_usd?"$"+Math.round(c.public_contribution_usd/1e6)+"M":"$0"}</b><span>public money</span></div>
    </div>`:""}
    ${c.revenue_latest&&c.revenue_latest.rev_per_trip_usd?`<div class="stat">
      <div><b>$${c.revenue_latest.rev_per_trip_usd.toFixed(2)}</b><span>avg toll per trip, ${c.revenue_latest.year}</span></div>
      <div><b>${c.h1_2026?(c.h1_2026.rev_per_trip_change_pct>0?"+":"")+c.h1_2026.rev_per_trip_change_pct+"%":"–"}</b><span>per-trip price, H1 2026</span></div>
      <div><b>${c.h1_2026?(c.h1_2026.traffic_change_pct>0?"+":"")+c.h1_2026.traffic_change_pct+"%":"–"}</b><span>traffic, H1 2026</span></div>
    </div>`:""}
    <dl class="kv">
      <dt>Operator</dt><dd>${esc(c.operator||"–")}</dd>
      <dt>Signed</dt><dd>${c.contract_signed||"–"}</dd>
      <dt>Opened</dt><dd>${c.opened||"–"}</dd>
      <dt>Miles</dt><dd>${fmt(Math.round(s.miles||0))} centerline mi in inventory</dd>
      <dt>Toll setting</dt><dd>${esc(c.toll_setting||"–")}</dd>
    </dl>
    <div class="dossier">
      <h3>Who profits</h3>
      ${owners?`<ul class="owners">${owners}</ul>`:"<p>Ownership research in progress.</p>"}
      ${c.ownership_source?`<p class="srcs">Ownership: ${esc(c.ownership_source)}.</p>`:""}
      ${c.notable?`<p>${esc(c.notable)}</p>`:""}
      ${c.non_compete_or_compensation_clause?`<h3>What the contract says</h3><p>${esc(c.non_compete_or_compensation_clause)}</p>`:""}
      ${c.buyout?`<h3>What it costs to end it</h3><p>${esc(typeof c.buyout==="string"?c.buyout:c.buyout.summary)}</p>${c.buyout.schedule?buyoutChart(c.buyout):""}${c.buyout.source?`<p class="srcs">Source: ${esc(c.buyout.source)}</p>`:""}`:""}
      ${c.toll_setting_source?`<p class="srcs">Toll rules: ${esc(c.toll_setting_source)}.</p>`:""}
      ${c.revenue_note?`<p class="srcs">${esc(c.revenue_note)}</p>`:""}
      <p class="srcs">${(c.sources||[]).slice(0,4).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(new URL(u).hostname.replace("www.",""))}</a>`).join(" · ")}</p>
      <button class="share" id="share-btn">Copy link to this road</button>
    </div>`;
  location.hash = "c-"+c.id;
  document.getElementById("share-btn").onclick = async (ev)=>{
    const url = location.href; const b=ev.currentTarget;
    try{ await navigator.clipboard.writeText(url); b.textContent="Copied"; }catch(e){ b.textContent=url; }
  };
  openRail();
}
const TYPE_LABEL={"revenue-concession":"Private concession","privately-owned-outright":"Privately owned outright","availability":"Private operator, public tolls","former-concession (now public)":"Former private concession, now public"};
const TYPE_COLOR={"revenue-concession":"--road-conc","privately-owned-outright":"--road-private","availability":"--road-stoll","former-concession (now public)":"--road-stoll"};
function buildIndex(){
  const btn=document.getElementById("idx-btn"), nav=document.getElementById("idx"), body=document.getElementById("idx-body");
  btn.onclick=()=>{ nav.hidden=!nav.hidden; btn.setAttribute("aria-expanded",String(!nav.hidden)); };
  const groups={}; for (const c of concessions) (groups[c.type]||=[]).push(c);
  body.innerHTML=Object.keys(TYPE_LABEL).filter(t=>groups[t]).map(t=>`<h4>${TYPE_LABEL[t]} (${groups[t].length})</h4>`+groups[t].sort((a,b)=>a.state.localeCompare(b.state)||a.name.localeCompare(b.name)).map(c=>`<button data-id="${esc(c.id)}"><b>${esc(c.state)}</b>${esc(c.name)}</button>`).join("")).join("");
  body.onclick=e=>{ const b=e.target.closest("button[data-id]"); if(!b) return; const c=concessions.find(x=>x.id===b.dataset.id); nav.hidden=true; btn.setAttribute("aria-expanded","false"); flyTo(c); showConcession(c); };
}
function flyTo(c){ const off = isPhone() ? [0,-window.innerHeight*0.22] : [0,0]; if (c.pin) map.flyTo({center:c.pin, zoom:11, offset:off}); else if (c.center) map.flyTo({center:c.center, zoom:c.zoom||10, offset:off}); }
function buyoutChart(b){
  const rows=b.schedule, max=Math.max(...rows.map(r=>r[1]));
  const bars=rows.map(([l,v])=>`<div class="bar"><span class="bl">${esc(l)}</span><i style="width:${(v/max*100).toFixed(1)}%"></i><span class="bv">$${(v/1e9).toFixed(2)}B</span></div>`).join("");
  return `<div class="buyout" role="img" aria-label="Buyout price by contract year">${bars}</div>${b.schedule_note?`<p class="srcs">${esc(b.schedule_note)}</p>`:""}`;
}
// On phones the dossier is a bottom sheet, so move the tapped spot up into the visible third of the map.
const isPhone = () => window.innerWidth <= 700;
function nudge(lngLat){ if (isPhone()) map.easeTo({center:lngLat, offset:[0,-window.innerHeight*0.22], duration:350}); }
function openRail(){ const r=document.getElementById("rail"); r.hidden=false; r.scrollTop=0; }
document.querySelector("#rail .close").onclick=()=>{ document.getElementById("rail").hidden=true; map.getSource("sel")?.setData({type:"FeatureCollection",features:[]}); };
function esc(s){ return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }


// ---- Install as an app (PWA) ----
(function(){
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/map/sw.js").catch(()=>{});
  const box=document.getElementById("install"), btn=document.getElementById("install-btn"), ios=document.getElementById("install-ios");
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let dismissed=false; try { dismissed = localStorage.getItem("wyr-install-dismissed")==="1"; } catch(e){}
  if (standalone || dismissed) return;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  let deferred=null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred=e; btn.hidden=false; ios.hidden=true; box.hidden=false; });
  btn.onclick = async () => { if (!deferred) return; deferred.prompt(); const r = await deferred.userChoice; deferred=null; if (r.outcome==="accepted") box.hidden=true; };
  if (isIOS) setTimeout(() => { btn.hidden=true; ios.hidden=false; box.hidden=false; }, 12000);   // after they've had a look around
  document.getElementById("install-x").onclick = () => { box.hidden=true; try { localStorage.setItem("wyr-install-dismissed","1"); } catch(e){} };
})();
