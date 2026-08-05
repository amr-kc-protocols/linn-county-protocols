
let currentTab='home',searchQuery='';
var lastTrigger=null; // element to restore focus to when the detail overlay closes

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── PATIENT MODE ─────────────────────────────────────────────
// PT = {kg, mode:'adult'|'peds', label} or null. Persisted so the
// weight survives page reloads and offline restarts mid-call.
var PT=null;
try{PT=JSON.parse(localStorage.getItem('linn-pt')||'null');}catch(e){}
if(PT&&(!(PT.kg>0)||PT.kg>300))PT=null;
var ptPanelOpen=false;

function savePT(){try{if(PT)localStorage.setItem('linn-pt',JSON.stringify(PT));else localStorage.removeItem('linn-pt');}catch(e){}}

function ptRules(name){
  var rules=PT_CALC[name];
  if(!PT||!rules)return[];
  return rules.filter(function(r){return r.who==='all'||r.who===PT.mode;});
}

function ptPanelHtml(rules){
  if(!PT||!rules.length)return'';
  return'<div class="pt-panel"><div class="pt-panel-hdr">⚖ This patient — '+esc(PT.label)+'</div>'+
    rules.map(function(r){return'<div class="pt-row"><span class="pt-ind">'+r.ind+(r.route?'<span class="pt-route">'+r.route+'</span>':'')+'</span><span class="pt-dose">'+r.f(PT.kg)+'</span></div>';}).join('')+
    '<div class="pt-panel-note">Computed from the reference dosing above — verify before administration.</div></div>';
}

// The emergency dose card: every PT_CALC rule tagged with a qc group,
// grouped and ordered by urgency, computed for the current patient.
var QC_ORDER=['Cardiac Arrest','Anaphylaxis','Seizure','Hypoglycemia','Opioid OD','Brady / SVT','Fluids & Pressors','MAI — PM'];
function quickCardInner(){
  if(!PT)return'<div class="pt-quick-empty">Enter a weight to see this patient&rsquo;s emergency doses</div>';
  var byGroup={};
  Object.keys(PT_CALC).forEach(function(name){
    PT_CALC[name].forEach(function(r){
      if(!r.qc)return;
      if(r.who!=='all'&&r.who!==PT.mode)return;
      var short=name.replace(/ ★.*$/,'').replace(/ \([^)]*\)$/,'');
      (byGroup[r.qc]=byGroup[r.qc]||[]).push('<div class="pt-q-row"><span class="pt-q-drug">'+short+(r.route?'<span class="pt-q-route">'+r.route+'</span>':'')+'</span><span class="pt-q-dose">'+r.f(PT.kg)+'</span></div>');
    });
  });
  return QC_ORDER.filter(function(g){return byGroup[g];}).map(function(g){
    return'<div class="pt-q-group">'+g+'</div>'+byGroup[g].join('');
  }).join('')+'<div class="pt-panel-note">Computed from formulary reference dosing — verify before administration.</div>';
}

function renderPatientBar(){
  var bar=document.getElementById('patientBar');
  if(!bar)return;
  var chip;
  var exp=ptPanelOpen?'true':'false';
  if(PT)chip='<button class="pt-chip set" id="ptChip" aria-expanded="'+exp+'" aria-controls="ptPanelForm">⚖ '+esc(PT.label)+'</button><button class="pt-clear" id="ptClear" aria-label="Clear patient weight">&times;</button>';
  else chip='<button class="pt-chip" id="ptChip" aria-expanded="'+exp+'" aria-controls="ptPanelForm">⚖ Set Patient Weight</button>';
  var panel='';
  if(ptPanelOpen){
    var mode=(PT&&PT.mode)||'adult';
    panel='<div class="pt-form" id="ptPanelForm">'+
      '<div class="pt-mode-row" role="group" aria-label="Patient type"><button class="pt-mode-btn'+(mode==='adult'?' active':'')+'" data-mode="adult" aria-pressed="'+(mode==='adult')+'">Adult</button><button class="pt-mode-btn'+(mode==='peds'?' active':'')+'" data-mode="peds" aria-pressed="'+(mode==='peds')+'">Pediatric</button></div>'+
      '<div class="weight-input-row"><label class="sr-only" for="ptWeight">Patient weight</label><input type="number" id="ptWeight" inputmode="decimal" placeholder="Weight" min="1" max="660" step="0.1"'+(PT?' value="'+PT.kg+'"':'')+'><button class="weight-unit-btn active" id="ptKg" aria-pressed="true">kg</button><button class="weight-unit-btn" id="ptLbs" aria-pressed="false">lbs</button><button class="pt-set-btn" id="ptDone">Done</button></div>'+
      '<div class="pt-brose" id="ptBrose" style="display:'+(mode==='peds'?'block':'none')+'"><div class="pt-brose-label">Broselow color (fallback — measure with tape when available)</div><div class="pt-brose-row">'+
        BROSELOW.map(function(b,i){return'<button class="pt-color" data-bi="'+i+'" style="background:'+b.hex+'" title="'+b.c+' '+b.range+'" aria-label="Broselow '+b.c+', '+b.range+'"></button>';}).join('')+
      '</div></div>'+
      '<div class="pt-quick" id="ptQuick">'+quickCardInner()+'</div></div>';
  }
  bar.innerHTML='<div class="pt-bar-inner">'+chip+panel+'</div>';
  wirePatientBar();
}

function wirePatientBar(){
  var ge=function(id){return document.getElementById(id);};
  var chip=ge('ptChip');
  if(chip)chip.onclick=function(){ptPanelOpen=!ptPanelOpen;renderPatientBar();if(ptPanelOpen){var w=ge('ptWeight');if(w){if(PT)w.value=PT.kg;w.focus();}}};
  var clr=ge('ptClear');
  if(clr)clr.onclick=function(){PT=null;ptPanelOpen=false;savePT();renderPatientBar();softRender();};
  // Mode explicitly chosen by the user stops the weight-based auto-suggest
  var userPickedMode=!!PT;
  function activeMode(){var b=document.querySelector('.pt-mode-btn.active');return b?b.dataset.mode:'adult';}
  function setModeUI(mode){
    document.querySelectorAll('.pt-mode-btn').forEach(function(x){var on=x.dataset.mode===mode;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on?'true':'false');});
    var br=ge('ptBrose');if(br)br.style.display=mode==='peds'?'block':'none';
  }
  function updateChipLive(){
    var c=ge('ptChip');
    if(c&&PT){c.classList.add('set');c.textContent='⚖ '+PT.label;}
  }
  // Live apply: doses update as the weight is typed — no Set button.
  function applyFromForm(){
    var w=ge('ptWeight');if(!w)return;
    var raw=parseFloat(w.value);
    if(!raw||raw<=0)return; // incomplete input — keep last applied patient
    var lbs=ge('ptLbs').classList.contains('active');
    var kg=Math.min(lbs?raw*.4536:raw,300);
    PT={kg:+kg.toFixed(1),mode:activeMode(),label:+kg.toFixed(1)+' kg'+(lbs?' ('+raw+' lbs)':'')+' · '+(activeMode()==='peds'?'Peds':'Adult')};
    savePT();updateChipLive();
    var qk=ge('ptQuick');if(qk)qk.innerHTML=quickCardInner();
    softRender();
  }
  var applyTimer=null;
  function applySoon(){clearTimeout(applyTimer);applyTimer=setTimeout(applyFromForm,180);}
  document.querySelectorAll('.pt-mode-btn').forEach(function(b){
    b.onclick=function(){userPickedMode=true;setModeUI(b.dataset.mode);applyFromForm();};
  });
  var doneBtn=ge('ptDone');
  if(doneBtn)doneBtn.onclick=function(){applyFromForm();ptPanelOpen=false;renderPatientBar();};
  var kgBtn=ge('ptKg'),lbsBtn=ge('ptLbs');
  function setUnitUI(on,off){on.classList.add('active');on.setAttribute('aria-pressed','true');off.classList.remove('active');off.setAttribute('aria-pressed','false');}
  if(kgBtn)kgBtn.onclick=function(){setUnitUI(kgBtn,lbsBtn);applyFromForm();};
  if(lbsBtn)lbsBtn.onclick=function(){setUnitUI(lbsBtn,kgBtn);applyFromForm();};
  var wIn=ge('ptWeight');
  if(wIn){
    wIn.addEventListener('input',function(){
      if(!userPickedMode){
        var raw=parseFloat(wIn.value);
        if(raw>0){var lbs=ge('ptLbs').classList.contains('active');setModeUI((lbs?raw*.4536:raw)<=36?'peds':'adult');}
      }
      applySoon();
    });
    wIn.addEventListener('keydown',function(e){if(e.key==='Enter'&&doneBtn)doneBtn.onclick();});
  }
  document.querySelectorAll('.pt-color').forEach(function(b){
    b.onclick=function(){
      var bz=BROSELOW[parseInt(b.dataset.bi)];
      PT={kg:bz.kg,mode:'peds',label:'Broselow '+bz.c+' ~'+bz.kg+' kg'};
      // Keep the panel open — the dose card below is the payoff
      savePT();renderPatientBar();softRender();
    };
  });
}

// Re-render content without the entrance animation or losing scroll —
// used for live updates (typed weight, cleared patient).
function softRender(){
  var y=window.scrollY;
  render(false);
  window.scrollTo(0,y);
}

// ── RENDER FUNCTIONS ─────────────────────────────────────────
function getScopeClass(s){
  if(!s)return'scope-all';const l=s.toLowerCase();
  if(l==='all')return'scope-all';
  if(l.includes('emt')&&l.includes('aemt')&&l.includes('pm'))return'scope-all';
  if(l.startsWith('pm')&&!l.includes('aemt')&&!l.includes('emt'))return'scope-pm';
  if(l.includes('aemt')&&!l.startsWith('pm')&&!l.includes('emt,'))return'scope-aemt';
  return'scope-multi';
}

function cardCls(animate,i){return animate?'card-appear" style="animation-delay:'+(i*.03)+'s"':'"';}

function renderProtocols(q,animate){
  const c=document.getElementById('content');let html='',shown=0;
  SECTIONS.protocols.forEach(sec=>{
    const f=q?sec.items.filter(i=>i.title.toLowerCase().includes(q)||(i.body&&i.body.toLowerCase().includes(q))):sec.items;
    if(!f.length)return;shown+=f.length;
    html+='<div class="section-header"><span class="section-icon">'+sec.icon+'</span><span class="section-label">'+sec.section+'</span></div>';
    f.forEach((item,i)=>{html+='<div class="protocol-card '+cardCls(animate,i)+' role="button" tabindex="0" aria-label="'+esc(item.title)+', scope '+esc(item.scope)+'" data-type="protocol" data-id="'+item.id+'"><div class="card-row"><div class="card-title">'+item.title+'</div><span class="scope-pill '+getScopeClass(item.scope)+'">'+item.scope+'</span><span class="chevron" aria-hidden="true">›</span></div></div>';});
  });
  if(!shown)html='<div class="empty-state"><div class="es-icon">🌾</div><div class="es-text">No protocols match "'+esc(q)+'"</div></div>';
  c.innerHTML=html;
}

function renderFormulary(q,animate){
  const c=document.getElementById('content');
  const f=q?FORMULARY.filter(d=>d.name.toLowerCase().includes(q)||d.cls.toLowerCase().includes(q)||(d.dose&&d.dose.toLowerCase().includes(q))):FORMULARY;
  if(!f.length){c.innerHTML='<div class="empty-state"><div class="es-icon">💊</div><div class="es-text">No drugs match "'+esc(q)+'"</div></div>';return;}
  c.innerHTML='<div style="padding:10px 14px">'+f.map((d,i)=>drugCardHtml(d,animate,i)).join('')+'</div>';
}

// Shared by the formulary tab and search results.
function drugCardHtml(d,animate,i){
  return'<div class="drug-card '+cardCls(animate,i)+'><div class="drug-header"><div><div class="drug-name">'+(d.name)+(d.isNew?'<span class="drug-new-badge" style="margin-left:8px">NEW</span>':'')+'</div><div class="drug-class">'+(d.cls)+'</div></div></div><div class="drug-body">'+ptPanelHtml(ptRules(d.name))+'<div class="drug-row"><span class="drug-row-label">Scope</span><span class="drug-row-val">'+(d.scope)+'</span></div><div class="drug-row"><span class="drug-row-label">Dosing</span><span class="drug-row-val">'+(d.dose)+'</span></div>'+(d.ci?'<div class="drug-row"><span class="drug-row-label">Contraind.</span><span class="drug-row-val">'+d.ci+'</span></div>':'')+(d.warn?'<div class="drug-warn">⚠ '+d.warn+'</div>':'')+'</div></div>';
}

function scopeCellsHtml(row){
  return'<div class="scope-cells"><span class="scope-cell sc-emt'+(row.emt?' on':'')+'">EMT</span><span class="scope-cell sc-aemt'+(row.aemt?' on':'')+'">AEMT</span><span class="scope-cell sc-pm'+(row.pm?' on':'')+'">PM</span></div>';
}

function renderScope(q){
  const c=document.getElementById('content');
  const cats=[{label:'Airway & Ventilation',key:'airway'},{label:'Circulation',key:'circulation'},{label:'Vascular Access',key:'vascular'},{label:'Medication Administration',key:'meds'},{label:'Trauma & Hemorrhage',key:'trauma'},{label:'Other',key:'other'}];
  let html='<div class="legend-bar"><span class="legend-item"><span class="legend-dot" style="background:var(--scope-emt)"></span>EMT</span><span class="legend-item"><span class="legend-dot" style="background:var(--scope-aemt)"></span>AEMT</span><span class="legend-item"><span class="legend-dot" style="background:var(--scope-pm)"></span>PM</span></div>',shown=0;
  cats.forEach(cat=>{
    const rows=q?SCOPE_DATA[cat.key].filter(r=>r.skill.toLowerCase().includes(q)):SCOPE_DATA[cat.key];
    if(!rows.length)return;shown+=rows.length;
    html+='<div class="section-header"><span class="section-label">'+(cat.label)+'</span></div>';
    rows.forEach(row=>{html+='<div class="scope-row"><div class="scope-skill">'+(row.skill)+'</div>'+scopeCellsHtml(row)+'</div>';});
  });
  if(q&&!shown)html='<div class="empty-state"><div class="es-icon">🌾</div><div class="es-text">No skills match "'+esc(q)+'"</div></div>';
  c.innerHTML=html;
}

function renderOps(q,animate){
  const c=document.getElementById('content');
  const f=q?OPS_DATA.filter(o=>o.title.toLowerCase().includes(q)||o.body.toLowerCase().includes(q)):OPS_DATA;
  if(!f.length){c.innerHTML='<div class="empty-state"><div class="es-icon">🌾</div><div class="es-text">No guidelines match "'+esc(q)+'"</div></div>';return;}
  c.innerHTML=f.map((item,i)=>'<div class="protocol-card '+cardCls(animate,i)+' role="button" tabindex="0" aria-label="'+esc(item.title)+'" data-type="ops" data-id="'+OPS_DATA.indexOf(item)+'"><div class="card-row"><div class="card-title">'+(item.title)+'</div><span class="chevron" aria-hidden="true">›</span></div></div>').join('');
}

function renderMAI(){
  const c=document.getElementById('content');
  c.innerHTML='<div style="padding:14px 14px 40px">\n  <div class="mai-warn-banner"><span style="font-size:18px;flex-shrink:0">⚠</span><span><b>PM scope only.</b> NMBA causes complete respiratory paralysis. Sedation and analgesia MUST be given before the paralytic. The patient is fully awake and aware without them.</span></div>\n  <div class="mai-calc"><div class="mai-calc-title">Weight-Based Dose Calculator</div>\n  <div class="weight-input-row"><input type="number" id="maiWeight" inputmode="decimal" placeholder="—" min="1" max="300" step="0.1"><button class="weight-unit-btn active" id="btnKg">kg</button><button class="weight-unit-btn" id="btnLbs">lbs</button></div>\n  <div class="calc-results" id="calcResults"><div class="calc-placeholder">Enter patient weight above</div></div></div>\n  <div style="margin-bottom:8px;font-family:var(--f-mono);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--white);border-bottom:1px solid var(--crimson);padding-bottom:6px">Step-by-Step Procedure</div>\n  <div class="mai-phase-header" style="margin:10px -14px 0">PHASE 1 — PREPARATION</div>\n  <div class="mai-step"><div class="mai-step-num">1</div><div class="mai-step-content"><div class="mai-step-title">Confirm indication</div><div class="mai-step-desc">GCS ≤ 8 with failure to protect airway, respiratory failure refractory to BVM/CPAP, anticipated airway deterioration.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">2</div><div class="mai-step-content"><div class="mai-step-title">Pre-oxygenate</div><div class="mai-step-desc">NRB at 15 LPM for minimum 3 minutes. Apneic oxygenation via NC at 15 LPM throughout procedure.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">3</div><div class="mai-step-content"><div class="mai-step-title">Assemble and check equipment</div><div class="mai-step-desc">Laryngoscope (blade tested), ETT (7.5–8.0 adult male, 7.0–7.5 adult female), 10 mL syringe, stylet, ETCO2, securing device, suction ready and ON, BVM at hand.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">4</div><div class="mai-step-content"><div class="mai-step-title">Confirm IV/IO access and position patient</div><div class="mai-step-desc">Patent and aspirating. Flush before medications. Ear-to-sternal-notch alignment. Ramp if obese.</div></div></div>\n  <div class="mai-phase-header" style="margin:10px -14px 0">PHASE 2 — INDUCTION</div>\n  <div class="mai-step"><div class="mai-step-num">5</div><div class="mai-step-content"><div class="mai-step-title">Administer Ketamine (Induction)</div><div class="mai-step-desc">1–1.5 mg/kg IV over 1 minute. Wait 60 seconds for onset. Signs of induction: eyes deviate, nystagmus, muscle relaxation.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">6</div><div class="mai-step-content"><div class="mai-step-title">Administer paralytic</div><div class="mai-step-desc">Vecuronium 0.1 mg/kg IV slow push over 30–60 seconds. OR Rocuronium 1 mg/kg IV (extended formulary — faster onset ~45–60 sec). Onset: 60–90 seconds. Confirm paralysis: jaw relaxation, absence of spontaneous movement.</div></div></div>\n  <div class="mai-phase-header" style="margin:10px -14px 0">PHASE 3 — INTUBATION</div>\n  <div class="mai-step"><div class="mai-step-num">7</div><div class="mai-step-content"><div class="mai-step-title">Laryngoscopy</div><div class="mai-step-desc">Blade in right side of mouth, sweep tongue left. Advance to vallecula (Mac) or under epiglottis (Miller). Lift — do not lever. Visualize vocal cords before advancing tube.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">8</div><div class="mai-step-content"><div class="mai-step-title">Pass ETT and confirm placement</div><div class="mai-step-desc">Advance until cuff passes 2–3 cm past cords. Adult depth: 21–23 cm at teeth. Inflate cuff 5–10 mL. Waveform ETCO2 gold standard — must see ≥ 6 consecutive waveforms. If no waveform: tube is in esophagus — remove immediately, BVM, reoxygenate, retry.</div></div></div>\n  <div class="mai-phase-header" style="margin:10px -14px 0">PHASE 4 — POST-INTUBATION</div>\n  <div class="mai-step"><div class="mai-step-num">9</div><div class="mai-step-content"><div class="mai-step-title">Ventilate to targets</div><div class="mai-step-desc">Rate: 10–12/min adult. TV: 6–8 mL/kg. SpO2 target: 94–98%. ETCO2 target: 35–45 mmHg. Do not hyperventilate.</div></div></div>\n  <div class="mai-step"><div class="mai-step-num">10</div><div class="mai-step-content"><div class="mai-step-title">Maintain sedation</div><div class="mai-step-desc">Midazolam 2.5–5 mg IV every 10–30 min as needed. Patient is paralyzed and fully aware without ongoing sedation.</div></div></div>\n  <div class="mai-phase-header" style="margin:10px -14px 12px">FAILED AIRWAY RESCUE</div>\n  <div class="callout callout-warn"><span class="callout-icon">⚠</span><span><b>If unable to intubate after 2 attempts:</b> BVM ventilate, place King LT supraglottic airway, contact DMO. If unable to oxygenate via BVM or SGA: surgical cricothyrotomy.</span></div>\n  <div class="callout callout-key"><span class="callout-icon">★</span><span>The paralyzed patient cannot protect their own airway. You own it. There is no backing out after the paralytic.</span></div>\n  </div>';
  document.getElementById('maiWeight').addEventListener('input',calcMAIDoses);
  document.getElementById('btnKg').addEventListener('click',function(){setUnit('kg');});
  document.getElementById('btnLbs').addEventListener('click',function(){setUnit('lbs');});
  // Pre-fill from Patient Mode so the calculator is ready on arrival
  if(PT&&PT.kg){maiUnit='kg';document.getElementById('btnKg').classList.add('active');document.getElementById('btnLbs').classList.remove('active');document.getElementById('maiWeight').value=PT.kg;calcMAIDoses();}
}

let maiUnit='kg';
function setUnit(u){maiUnit=u;document.getElementById('btnKg').classList.toggle('active',u==='kg');document.getElementById('btnLbs').classList.toggle('active',u==='lbs');calcMAIDoses();}
// Pure dose math, kept separate from rendering so it can be tested
// directly (test/doses.test.js). Weight is capped at 300 kg here, the
// same ceiling the patient-weight panel applies.
function maiDoses(kg){
  kg=Math.min(kg,300);
  return [
    {name:'Ketamine (Induction)',detail:'1–1.5 mg/kg IV over 1 min',lo:kg*1,hi:kg*1.5,unit:'mg',note:'Administer over 60 sec. Wait 60 sec for effect.'},
    {name:'Vecuronium (Paralytic)',detail:'0.1 mg/kg IV over 30–60 sec',lo:kg*.1,hi:null,unit:'mg',note:'Onset 60–90 sec. Duration 30–60 min.'},
    {name:'Rocuronium (Paralytic — alt)',detail:'1 mg/kg IV',lo:kg*1,hi:null,unit:'mg',note:'Onset ~45–60 sec. Extended formulary.'},
    {name:'Midazolam (Post-intubation sedation)',detail:'2.5–5 mg IV every 10–30 min',lo:2.5,hi:5,unit:'mg',note:'Fixed dose — not weight-based.'},
    {name:'Lidocaine (IO site analgesia)',detail:'40 mg IO slow push → 10 mL NS → 20 mg IO',lo:40,hi:null,unit:'mg',note:'Fixed adult dose. Peds: 0.5 mg/kg (max 40 mg).'}
  ];
}

function calcMAIDoses(){
  const raw=parseFloat(document.getElementById('maiWeight').value);
  const el=document.getElementById('calcResults');
  if(!raw||isNaN(raw)||raw<=0){el.innerHTML='<div class="calc-placeholder">Enter patient weight above</div>';return;}
  const kg=Math.min(maiUnit==='lbs'?raw*.4536:raw,300);
  const drugs=maiDoses(kg);
  el.innerHTML='<div style="font-family:var(--f-mono);font-size:11px;color:var(--steel);margin-bottom:6px">Patient weight: '+(kg.toFixed(1))+' kg'+(maiUnit==='lbs'?' ('+raw+' lbs)':'')+'</div>'+
  drugs.map(d=>'<div class="calc-drug-row"><div class="calc-drug-name">'+(d.name)+'</div><div class="calc-drug-detail">'+(d.detail)+'</div><div class="calc-drug-dose">'+(d.hi?(d.lo.toFixed(1)+'–'+d.hi.toFixed(1)):d.lo.toFixed(1))+' <span>'+(d.unit)+'</span></div>'+'<div style="font-size:11px;color:var(--steel);margin-top:3px">'+(d.note)+'</div></div>').join('');
}

// ── SEARCH ───────────────────────────────────────────────────
// One index across protocols, medications, scope and ops, so a search
// finds the right thing regardless of which tab you happen to be on.
// Protocol bodies are HTML, so they are stripped once at build time —
// otherwise "div", "class" and "span" match nearly every protocol.
function stripHtml(s){
  return String(s||'')
    .replace(/<[^>]*>/g,' ')          // tags
    .replace(/&[a-z]+;|&#\d+;/gi,' ') // entities
    .replace(/\s+/g,' ')
    .toLowerCase();
}

// What a medic might type, mapped to what the content actually says.
// Brand names are for drugs on the 2026 formulary; abbreviations are
// ones in common radio and chart use. Kept conservative on purpose —
// a wrong alias sends someone to the wrong protocol.
var SEARCH_ALIASES={
  narcan:'naloxone', versed:'midazolam', zofran:'ondansetron',
  benadryl:'diphenhydramine', solumedrol:'methylprednisolone',
  'solu-medrol':'methylprednisolone', levophed:'norepinephrine',
  cordarone:'amiodarone', pacerone:'amiodarone', adenocard:'adenosine',
  ketalar:'ketamine', zemuron:'rocuronium', norcuron:'vecuronium',
  sublimaze:'fentanyl', toradol:'ketorolac', dilaudid:'hydromorphone',
  tylenol:'acetaminophen', apap:'acetaminophen', asa:'aspirin',
  atrovent:'ipratropium', proventil:'albuterol', ventolin:'albuterol',
  bicarb:'sodium bicarbonate', ntg:'nitroglycerin', nitro:'nitroglycerin',
  mag:'magnesium', ns:'normal saline', d10:'dextrose', epi:'epinephrine',
  // Linn calls it MAI; the wider world calls it RSI
  rsi:'medication-assisted intubation', dai:'medication-assisted intubation',
  // Presentations
  mi:'acs', stemi:'acs', 'heart attack':'acs', cva:'stroke',
  sob:'respiratory', 'shortness of breath':'respiratory',
  od:'overdose', dka:'hyperglycemia', 'v-fib':'vf', 'v fib':'vf',
  'v-tach':'vt', 'v tach':'vt', chf:'pulmonary edema',
  tbi:'head', 'c-spine':'spinal', cspine:'spinal',
  opiate:'opioid', narcotic:'opioid', 'low sugar':'hypoglycemia',
  seizing:'seizure', 'allergic reaction':'anaphylaxis'
};

var SEARCH_INDEX=null;
function buildSearchIndex(){
  var idx=[];
  SECTIONS.protocols.forEach(function(sec){
    sec.items.forEach(function(item){
      idx.push({kind:'protocol',id:item.id,title:item.title,
        meta:sec.section+' · Scope: '+item.scope,
        keys:(item.scope||'').toLowerCase()+' '+sec.section.toLowerCase(),
        text:stripHtml(item.body),ref:item});
    });
  });
  FORMULARY.forEach(function(d){
    idx.push({kind:'drug',id:d.name,title:d.name,meta:d.cls,
      keys:(d.cls+' '+d.scope).toLowerCase(),
      text:stripHtml(d.dose+' '+(d.ci||'')+' '+(d.warn||'')),ref:d});
  });
  OPS_DATA.forEach(function(o,i){
    idx.push({kind:'ops',id:i,title:o.title,meta:'Operational Guidelines',
      keys:'ops operations',text:stripHtml(o.body),ref:o});
  });
  Object.keys(SCOPE_DATA).forEach(function(cat){
    SCOPE_DATA[cat].forEach(function(r){
      idx.push({kind:'scope',id:r.skill,title:r.skill,meta:'Scope of practice',
        keys:cat.toLowerCase(),text:'',ref:r});
    });
  });
  // The MAI procedure page is a destination too, not just a protocol
  idx.push({kind:'page',id:'mai',title:'MAI — Medication-Assisted Intubation',
    meta:'Procedure &amp; dose calculator',
    keys:'mai rsi intubation paralytic induction ketamine vecuronium rocuronium airway',
    text:'medication assisted intubation rapid sequence induction paralytic'});
  SEARCH_INDEX=idx;
  return idx;
}

// Expand a query token through the alias table, so "narcan" also looks
// for "naloxone".
function expandToken(t){
  var out=[t];
  if(SEARCH_ALIASES[t])out.push(SEARCH_ALIASES[t]);
  return out;
}

// Every token must match somewhere (AND). Title matches outrank body
// matches so "ketamine" leads with the drug, not a protocol that
// happens to mention it.
function reWordStart(t){
  return new RegExp('\\b'+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
}
function scoreEntry(e,tokens){
  var total=0;
  for(var i=0;i<tokens.length;i++){
    var variants=expandToken(tokens[i]),best=0;
    for(var v=0;v<variants.length;v++){
      var t=variants[v],title=e.title.toLowerCase(),s=0;
      // Body and keyword matches must start at a word boundary, or
      // "versed" matches "reversed" and "epi" matches "biphasic".
      var w=reWordStart(t);
      if(title===t)s=120;
      else if(title.indexOf(t)===0)s=80;
      else if(w.test(title))s=60;
      else if(title.indexOf(t)!==-1)s=40;
      else if(w.test(e.keys))s=18;
      else if(w.test(e.text))s=8;
      if(s>best)best=s;
    }
    if(!best)return 0;   // this token matched nothing — drop the entry
    total+=best;
  }
  if(e.kind==='drug')total+=4;   // nudge medications up on drug-name searches
  return total;
}

function searchAll(q){
  if(!SEARCH_INDEX)buildSearchIndex();
  var tokens=q.toLowerCase().split(/\s+/).filter(Boolean);
  if(!tokens.length)return[];
  // Also try the whole phrase as one token, for aliases like "heart attack"
  var phrase=q.toLowerCase().trim();
  var results=[];
  SEARCH_INDEX.forEach(function(e){
    var s=scoreEntry(e,tokens);
    if(SEARCH_ALIASES[phrase])s=Math.max(s,scoreEntry(e,[phrase]));
    if(s>0)results.push({e:e,s:s});
  });
  results.sort(function(a,b){return b.s-a.s||a.e.title.localeCompare(b.e.title);});
  return results;
}

var SEARCH_GROUPS=[
  ['protocol','📋','Protocols'],
  ['drug','💊','Medications'],
  ['page','💉','Procedures'],
  ['ops','🚑','Operations'],
  ['scope','🎖','Scope of Practice']
];

function renderSearch(q,animate){
  var c=document.getElementById('content');
  var results=searchAll(q);
  if(!results.length){
    c.innerHTML='<div class="empty-state"><div class="es-icon">🌾</div><div class="es-text">Nothing matches &ldquo;'+esc(q)+'&rdquo;</div></div>';
    return 0;
  }
  var by={};
  results.forEach(function(r){(by[r.e.kind]=by[r.e.kind]||[]).push(r.e);});
  var html='',n=0;
  SEARCH_GROUPS.forEach(function(g){
    var kind=g[0],list=by[kind];
    if(!list||!list.length)return;
    html+='<div class="section-header"><span class="section-icon">'+g[1]+'</span>'+
          '<span class="section-label">'+g[2]+'</span>'+
          '<span class="sec-count">'+list.length+'</span></div>';
    list.forEach(function(e,i){
      n++;
      if(kind==='drug'){
        html+=drugCardHtml(e.ref,animate,i);
      }else if(kind==='scope'){
        html+='<div class="scope-row"><div class="scope-skill">'+e.title+'</div>'+scopeCellsHtml(e.ref)+'</div>';
      }else if(kind==='page'){
        html+='<div class="protocol-card '+cardCls(animate,i)+' role="button" tabindex="0" aria-label="'+esc(e.title)+'" data-goto="mai"><div class="card-row"><div class="card-title">'+e.title+'</div><span class="chevron" aria-hidden="true">›</span></div></div>';
      }else{
        html+='<div class="protocol-card '+cardCls(animate,i)+' role="button" tabindex="0" aria-label="'+esc(e.title)+'" data-type="'+kind+'" data-id="'+e.id+'"><div class="card-row"><div class="card-title">'+e.title+'</div>'+
          (kind==='protocol'?'<span class="scope-pill '+getScopeClass(e.ref.scope)+'">'+e.ref.scope+'</span>':'')+
          '<span class="chevron" aria-hidden="true">›</span></div></div>';
      }
    });
  });
  c.innerHTML=html;
  return n;
}

// ── HOME ─────────────────────────────────────────────────────
// Landing screen. Reference material and training material are
// deliberately separated: training is amber, badged, and carries an
// explicit note that it is neither a standing order nor CE credit.
var HOME_TILES=[
  ['protocols','i-book','Protocols','Standing orders by category','var(--crimson-br)'],
  ['formulary','i-pill','Formulary','2026 carried medications','var(--crimson-br)'],
  ['scope','i-badge','Scope','EMT / AEMT / Paramedic','var(--sky)'],
  ['ops','i-truck','Ops','Operational guidelines','var(--sky)'],
  ['mai','i-syringe','MAI','Medication-assisted intubation','var(--crimson-br)']
];

function academyProgress(){
  try{
    var s=JSON.parse(localStorage.getItem('airway_academy_v1')||'null');
    if(!s)return null;
    var mods=s.modules||{},done=0;
    Object.keys(mods).forEach(function(k){if(mods[k]&&mods[k].passed)done++;});
    return {done:done,certified:!!s.finalPassed};
  }catch(e){return null;}
}

// Videos marked watched on the Operative IQ narcotic tracking page.
function oiqProgress(){
  try{
    var s=JSON.parse(localStorage.getItem('linn_oiq_v1')||'null');
    return s?Object.keys(s).length:0;
  }catch(e){return 0;}
}

function renderHome(){
  var h='<div class="home">';
  h+='<div class="home-hero"><div class="home-hero-title">Linn County EMS</div>'+
     '<div class="home-hero-sub">2026 Standing Orders<br>Dr. Ameet Deshmukh, MD</div></div>';

  // Patient weight — drives every computed dose in the app
  if(PT){
    h+='<button type="button" class="home-pt set" data-goto="patient"><span class="home-pt-ico">&#9878;</span>'+
       '<span class="home-pt-body"><span class="home-pt-val">'+esc(PT.label)+'</span>'+
       '<span class="home-pt-lbl">Doses computed for this patient</span></span><span class="home-pt-arr">&rsaquo;</span></button>';
  }else{
    h+='<button type="button" class="home-pt" data-goto="patient"><span class="home-pt-ico">&#9878;</span>'+
       '<span class="home-pt-body"><span class="home-pt-val">Set patient weight</span>'+
       '<span class="home-pt-lbl">Unlocks weight-based dosing everywhere</span></span><span class="home-pt-arr">&rsaquo;</span></button>';
  }

  h+='<div class="home-sec"><span class="home-sec-label">Protocols &amp; Reference</span></div>';
  h+='<div class="qa-grid">';
  HOME_TILES.forEach(function(t){
    h+='<button type="button" class="qa-tile" data-goto="'+t[0]+'" style="--ac:'+t[4]+'">'+
       '<span class="qa-ico"><svg viewBox="0 0 24 24"><use href="#'+t[1]+'"></use></svg></span>'+
       '<span class="qa-label">'+t[2]+'</span><span class="qa-sub">'+t[3]+'</span></button>';
  });
  h+='<a class="qa-tile" href="LinnProtocols-2026.pdf" target="_blank" rel="noopener" style="--ac:var(--steel)">'+
     '<span class="qa-ico"><svg viewBox="0 0 24 24"><use href="#i-doc"></use></svg></span>'+
     '<span class="qa-label">Full PDF</span><span class="qa-sub">Signed 2026 protocol document</span></a>';
  h+='</div>';

  h+='<div class="home-sec edu"><span class="home-sec-label">Training &amp; Study</span></div>';
  h+='<div class="edu-disclaimer">Study material &mdash; not standing orders, and not CE credit at this time.</div>';
  h+='<div class="edu-grid" style="margin-top:9px">';
  var ap=academyProgress();
  var apLine=ap?(ap.certified?'Certificate earned &middot; 8 of 8 modules':(ap.done?ap.done+' of 8 modules passed':'Not started &middot; 8 modules')):'Not started &middot; 8 modules';
  h+='<a class="edu-tile" href="airway-academy.html">'+
     '<span class="edu-ico"><svg viewBox="0 0 24 24"><use href="#i-cap"></use></svg></span>'+
     '<span class="edu-body"><span class="edu-top"><span class="edu-name">Airway &amp; RSI Academy</span><span class="edu-badge">Training</span></span>'+
     '<span class="edu-sub">Interactive course &mdash; the decision to intubate, the difficult airway, and physiologic optimization</span>'+
     '<span class="edu-prog">'+apLine+'</span></span><span class="edu-arr">&rsaquo;</span></a>';
  h+='<a class="edu-tile" href="quiz.html">'+
     '<span class="edu-ico"><svg viewBox="0 0 24 24"><use href="#i-check"></use></svg></span>'+
     '<span class="edu-body"><span class="edu-top"><span class="edu-name">Protocol Quiz</span><span class="edu-badge">Self-test</span></span>'+
     '<span class="edu-sub">EMT, AEMT and Paramedic question banks with instant feedback</span></span>'+
     '<span class="edu-arr">&rsaquo;</span></a>';
  var oiq=oiqProgress();
  h+='<a class="edu-tile" href="narcotic-tracking.html">'+
     '<span class="edu-ico"><svg viewBox="0 0 24 24"><use href="#i-pill"></use></svg></span>'+
     '<span class="edu-body"><span class="edu-top"><span class="edu-name">Narcotic Tracking</span><span class="edu-badge">Rollout</span></span>'+
     '<span class="edu-sub">Operative IQ &amp; Frontline &mdash; crew change, administration, audit and restock</span>'+
     '<span class="edu-prog">'+(oiq?(oiq>=7?'All 7 videos watched':oiq+' of 7 videos watched'):'7 short videos')+'</span></span>'+
     '<span class="edu-arr">&rsaquo;</span></a>';
  h+='</div></div>';
  document.getElementById('content').innerHTML=h;
}

// Report how many results a search produced. Counted off the rendered
// DOM so it can't drift from what is on screen.
function announceResults(){
  if(!searchQuery){announce(TAB_LABELS[currentTab]||'');return;}
  var c=document.getElementById('content');
  var n=c?c.querySelectorAll('.protocol-card,.drug-card,.scope-row').length:0;
  announce(n+(n===1?' result':' results')+' for '+searchQuery);
}

function render(animate){
  const q=searchQuery.trim().toLowerCase();
  if(q){renderSearch(q,animate);return;}
  if(currentTab==='home')renderHome();
  else if(currentTab==='protocols')renderProtocols(q,animate);
  else if(currentTab==='formulary')renderFormulary(q,animate);
  else if(currentTab==='scope')renderScope(q);
  else if(currentTab==='ops')renderOps(q,animate);
  else if(currentTab==='mai')renderMAI();
}

function showDetail(type,id){
  const dv=document.getElementById('detail-view');
  const dt=document.getElementById('detailTitle');
  const ds=document.getElementById('detailSubtitle');
  const db=document.getElementById('detailBody');
  if(type==='protocol'){
    let item=null,sn='';
    SECTIONS.protocols.forEach(function(s){var f=s.items.find(function(i){return i.id===id;});if(f){item=f;sn=s.section;}});
    if(!item)return;
    dt.textContent=item.title;ds.textContent=(sn)+' · Scope: '+(item.scope);db.innerHTML=item.body;
  }else if(type==='ops'){
    const item=OPS_DATA[parseInt(id)];if(!item)return;
    dt.textContent=item.title;ds.textContent='Operational Guidelines';db.innerHTML=item.body;
  }
  dv.style.display='block';
  dv.scrollTop=0;
  // Send focus into the overlay and remember where to put it back
  lastTrigger=document.activeElement;
  var bb=document.getElementById('backBtn');
  if(bb)bb.focus();
  // Push a history entry so the phone/browser back button closes the
  // overlay instead of leaving the app.
  if(!(history.state&&history.state.detail))history.pushState({detail:true},'');
}
function hideDetail(){
  var dv=document.getElementById('detail-view');
  if(dv){dv.style.display='none';}
  // Return focus to whatever opened the overlay, so keyboard and screen
  // reader users don't get dumped at the top of the document.
  if(lastTrigger&&lastTrigger.focus){lastTrigger.focus();lastTrigger=null;}
}
function closeDetail(){
  var dv=document.getElementById('detail-view');
  if(dv&&dv.style.display==='block'&&history.state&&history.state.detail)history.back();
  else hideDetail();
}
window.addEventListener('popstate',hideDetail);

var backBtnEl = document.getElementById('backBtn');
if(backBtnEl){
  backBtnEl.addEventListener('click', function(e){e.preventDefault();e.stopPropagation();closeDetail();});
  backBtnEl.addEventListener('touchend', function(e){e.preventDefault();e.stopPropagation();closeDetail();});
}
document.querySelectorAll('.nav-tab').forEach(function(tab){
  tab.addEventListener('click',function(){
    if(!tab.dataset.tab)return; // link-style tabs don't steal the active state
    closeDetail();
    goTab(tab.dataset.tab);
  });
});
document.getElementById('searchInput').addEventListener('input',function(e){
  searchQuery=e.target.value;
  document.getElementById('clearBtn').style.display=searchQuery?'block':'none';
  // A search overrides whatever tab is showing, and clearing it has to
  // restore that tab — including MAI, whose calculator is rebuilt.
  render();
  announceResults();
});
document.getElementById('clearBtn').addEventListener('click',function(){
  document.getElementById('searchInput').value='';
  searchQuery='';
  document.getElementById('clearBtn').style.display='none';
  render();
  announce(TAB_LABELS[currentTab]||'');
});
// ── ACCESSIBILITY ────────────────────────────────────────────
// Short status messages for screen readers. Tab and search changes
// rewrite #content silently, so without this a non-sighted user gets
// no feedback that anything happened.
function announce(msg){
  var el=document.getElementById('a11yStatus');
  if(el)el.textContent=msg;
}

var TAB_LABELS={home:'Home',protocols:'Protocols',formulary:'Formulary',scope:'Scope of practice',ops:'Operational guidelines',mai:'Medication-assisted intubation'};

// Switch to a tab programmatically, keeping the nav highlight, the ARIA
// state and the roving tabindex in sync.
function goTab(name){
  currentTab=name;
  document.querySelectorAll('.nav-tab').forEach(function(t){
    var on=t.dataset.tab===name;
    t.classList.toggle('active',on);
    if(t.hasAttribute('role')){
      t.setAttribute('aria-selected',on?'true':'false');
      t.tabIndex=on?0:-1;
    }
    // The tab bar scrolls on narrow phones — keep the active tab visible
    if(on&&t.scrollIntoView)t.scrollIntoView({block:'nearest',inline:'nearest'});
  });
  window.scrollTo(0,0);
  render(true);
  announce(TAB_LABELS[name]||name);
}

// Arrow-key navigation across the tab bar, as a tablist is expected to
// support. Enter/Space still activate via the normal click handler.
function wireTabKeys(){
  var tabs=Array.prototype.slice.call(document.querySelectorAll('.nav-tab[role="tab"]'));
  tabs.forEach(function(tab,i){
    tab.addEventListener('keydown',function(e){
      var next=null;
      if(e.key==='ArrowRight')next=tabs[(i+1)%tabs.length];
      else if(e.key==='ArrowLeft')next=tabs[(i-1+tabs.length)%tabs.length];
      else if(e.key==='Home')next=tabs[0];
      else if(e.key==='End')next=tabs[tabs.length-1];
      else return;
      e.preventDefault();
      next.focus();
      if(next.dataset.tab){closeDetail();goTab(next.dataset.tab);}
    });
  });
}

document.getElementById('content').addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  var t=e.target.closest('[data-type],[data-goto]');
  if(!t)return;
  e.preventDefault();
  t.click();
});
document.getElementById('content').addEventListener('click',function(e){
  var tile=e.target.closest('[data-goto]');
  if(tile){
    var dest=tile.dataset.goto;
    if(dest==='patient'){
      ptPanelOpen=true;
      renderPatientBar();
      window.scrollTo(0,0);
      var w=document.getElementById('ptWeight');
      if(w){if(PT)w.value=PT.kg;w.focus();}
    }else{
      goTab(dest);
    }
    return;
  }
  var card=e.target.closest('[data-type]');
  if(card){showDetail(card.dataset.type,card.dataset.id);}
});
document.addEventListener('keydown', function(e){if(e.key==='Escape'){closeDetail();}});
renderPatientBar();
wireTabKeys();
render(true);
