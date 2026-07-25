
let currentTab='home',searchQuery='';

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
  if(PT)chip='<button class="pt-chip set" id="ptChip">⚖ '+esc(PT.label)+'</button><button class="pt-clear" id="ptClear" aria-label="Clear patient">&times;</button>';
  else chip='<button class="pt-chip" id="ptChip">⚖ Set Patient Weight</button>';
  var panel='';
  if(ptPanelOpen){
    var mode=(PT&&PT.mode)||'adult';
    panel='<div class="pt-form">'+
      '<div class="pt-mode-row"><button class="pt-mode-btn'+(mode==='adult'?' active':'')+'" data-mode="adult">Adult</button><button class="pt-mode-btn'+(mode==='peds'?' active':'')+'" data-mode="peds">Pediatric</button></div>'+
      '<div class="weight-input-row"><input type="number" id="ptWeight" inputmode="decimal" placeholder="Weight" min="1" max="660" step="0.1"'+(PT?' value="'+PT.kg+'"':'')+'><button class="weight-unit-btn active" id="ptKg">kg</button><button class="weight-unit-btn" id="ptLbs">lbs</button><button class="pt-set-btn" id="ptDone">Done</button></div>'+
      '<div class="pt-brose" id="ptBrose" style="display:'+(mode==='peds'?'block':'none')+'"><div class="pt-brose-label">Broselow color (fallback — measure with tape when available)</div><div class="pt-brose-row">'+
        BROSELOW.map(function(b,i){return'<button class="pt-color" data-bi="'+i+'" style="background:'+b.hex+'" title="'+b.c+' '+b.range+'"></button>';}).join('')+
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
    document.querySelectorAll('.pt-mode-btn').forEach(function(x){x.classList.toggle('active',x.dataset.mode===mode);});
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
  if(kgBtn)kgBtn.onclick=function(){kgBtn.classList.add('active');lbsBtn.classList.remove('active');applyFromForm();};
  if(lbsBtn)lbsBtn.onclick=function(){lbsBtn.classList.add('active');kgBtn.classList.remove('active');applyFromForm();};
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
    f.forEach((item,i)=>{html+='<div class="protocol-card '+cardCls(animate,i)+' data-type="protocol" data-id="'+item.id+'"><div class="card-row"><div class="card-title">'+item.title+'</div><span class="scope-pill '+getScopeClass(item.scope)+'">'+item.scope+'</span><span class="chevron">›</span></div></div>';});
  });
  if(!shown)html='<div class="empty-state"><div class="es-icon">🌾</div><div class="es-text">No protocols match "'+esc(q)+'"</div></div>';
  c.innerHTML=html;
}

function renderFormulary(q,animate){
  const c=document.getElementById('content');
  const f=q?FORMULARY.filter(d=>d.name.toLowerCase().includes(q)||d.cls.toLowerCase().includes(q)||(d.dose&&d.dose.toLowerCase().includes(q))):FORMULARY;
  if(!f.length){c.innerHTML='<div class="empty-state"><div class="es-icon">💊</div><div class="es-text">No drugs match "'+esc(q)+'"</div></div>';return;}
  c.innerHTML='<div style="padding:10px 14px">'+f.map((d,i)=>'<div class="drug-card '+cardCls(animate,i)+'><div class="drug-header"><div><div class="drug-name">'+(d.name)+(d.isNew?'<span class="drug-new-badge" style="margin-left:8px">NEW</span>':'')+'</div><div class="drug-class">'+(d.cls)+'</div></div></div><div class="drug-body">'+ptPanelHtml(ptRules(d.name))+'<div class="drug-row"><span class="drug-row-label">Scope</span><span class="drug-row-val">'+(d.scope)+'</span></div><div class="drug-row"><span class="drug-row-label">Dosing</span><span class="drug-row-val">'+(d.dose)+'</span></div>'+(d.ci?'<div class="drug-row"><span class="drug-row-label">Contraind.</span><span class="drug-row-val">'+d.ci+'</span></div>':'')+(d.warn?'<div class="drug-warn">⚠ '+d.warn+'</div>':'')+'</div></div>').join('')+'</div>';
}

function renderScope(q){
  const c=document.getElementById('content');
  const cats=[{label:'Airway & Ventilation',key:'airway'},{label:'Circulation',key:'circulation'},{label:'Vascular Access',key:'vascular'},{label:'Medication Administration',key:'meds'},{label:'Trauma & Hemorrhage',key:'trauma'},{label:'Other',key:'other'}];
  let html='<div class="legend-bar"><span class="legend-item"><span class="legend-dot" style="background:var(--scope-emt)"></span>EMT</span><span class="legend-item"><span class="legend-dot" style="background:var(--scope-aemt)"></span>AEMT</span><span class="legend-item"><span class="legend-dot" style="background:var(--scope-pm)"></span>PM</span></div>',shown=0;
  cats.forEach(cat=>{
    const rows=q?SCOPE_DATA[cat.key].filter(r=>r.skill.toLowerCase().includes(q)):SCOPE_DATA[cat.key];
    if(!rows.length)return;shown+=rows.length;
    html+='<div class="section-header"><span class="section-label">'+(cat.label)+'</span></div>';
    rows.forEach(row=>{html+='<div class="scope-row"><div class="scope-skill">'+(row.skill)+'</div><div class="scope-cells"><span class="scope-cell sc-emt'+(row.emt?' on':'')+'">EMT</span><span class="scope-cell sc-aemt'+(row.aemt?' on':'')+'">AEMT</span><span class="scope-cell sc-pm'+(row.pm?' on':'')+'">PM</span></div></div>';});
  });
  if(q&&!shown)html='<div class="empty-state"><div class="es-icon">🌾</div><div class="es-text">No skills match "'+esc(q)+'"</div></div>';
  c.innerHTML=html;
}

function renderOps(q,animate){
  const c=document.getElementById('content');
  const f=q?OPS_DATA.filter(o=>o.title.toLowerCase().includes(q)||o.body.toLowerCase().includes(q)):OPS_DATA;
  if(!f.length){c.innerHTML='<div class="empty-state"><div class="es-icon">🌾</div><div class="es-text">No guidelines match "'+esc(q)+'"</div></div>';return;}
  c.innerHTML=f.map((item,i)=>'<div class="protocol-card '+cardCls(animate,i)+' data-type="ops" data-id="'+OPS_DATA.indexOf(item)+'"><div class="card-row"><div class="card-title">'+(item.title)+'</div><span class="chevron">›</span></div></div>').join('');
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
function calcMAIDoses(){
  const raw=parseFloat(document.getElementById('maiWeight').value);
  const el=document.getElementById('calcResults');
  if(!raw||isNaN(raw)||raw<=0){el.innerHTML='<div class="calc-placeholder">Enter patient weight above</div>';return;}
  const kg=Math.min(maiUnit==='lbs'?raw*.4536:raw,300);
  const drugs=[
    {name:'Ketamine (Induction)',detail:'1–1.5 mg/kg IV over 1 min',lo:kg*1,hi:kg*1.5,unit:'mg',note:'Administer over 60 sec. Wait 60 sec for effect.'},
    {name:'Vecuronium (Paralytic)',detail:'0.1 mg/kg IV over 30–60 sec',lo:kg*.1,hi:null,unit:'mg',note:'Onset 60–90 sec. Duration 30–60 min.'},
    {name:'Rocuronium (Paralytic — alt)',detail:'1 mg/kg IV',lo:kg*1,hi:null,unit:'mg',note:'Onset ~45–60 sec. Extended formulary.'},
    {name:'Midazolam (Post-intubation sedation)',detail:'2.5–5 mg IV every 10–30 min',lo:2.5,hi:5,unit:'mg',note:'Fixed dose — not weight-based.'},
    {name:'Lidocaine (IO site analgesia)',detail:'40 mg IO slow push → 10 mL NS → 20 mg IO',lo:40,hi:null,unit:'mg',note:'Fixed adult dose. Peds: 0.5 mg/kg (max 40 mg).'}
  ];
  el.innerHTML='<div style="font-family:var(--f-mono);font-size:11px;color:var(--steel);margin-bottom:6px">Patient weight: '+(kg.toFixed(1))+' kg'+(maiUnit==='lbs'?' ('+raw+' lbs)':'')+'</div>'+
  drugs.map(d=>'<div class="calc-drug-row"><div class="calc-drug-name">'+(d.name)+'</div><div class="calc-drug-detail">'+(d.detail)+'</div><div class="calc-drug-dose">'+(d.hi?(d.lo.toFixed(1)+'–'+d.hi.toFixed(1)):d.lo.toFixed(1))+' <span>'+(d.unit)+'</span></div>'+'<div style="font-size:11px;color:var(--steel);margin-top:3px">'+(d.note)+'</div></div>').join('');
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
  h+='<div class="edu-disclaimer">Study material &mdash; not standing orders, and not CE credit toward renewal.</div>';
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
  h+='</div></div>';
  document.getElementById('content').innerHTML=h;
}

function render(animate){
  const q=searchQuery.trim().toLowerCase();
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
  // Push a history entry so the phone/browser back button closes the
  // overlay instead of leaving the app.
  if(!(history.state&&history.state.detail))history.pushState({detail:true},'');
}
function hideDetail(){
  var dv=document.getElementById('detail-view');
  if(dv){dv.style.display='none';}
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
  // Home has nothing to filter — searching from it means "find a protocol"
  if(currentTab==='home'&&searchQuery){goTab('protocols');return;}
  if(currentTab==='mai')return; // MAI is a fixed procedure page — re-rendering would wipe the calculator
  render();
});
document.getElementById('clearBtn').addEventListener('click',function(){
  document.getElementById('searchInput').value='';
  searchQuery='';
  document.getElementById('clearBtn').style.display='none';
  if(currentTab==='mai')return;
  render();
});
// Switch to a tab programmatically, keeping the nav highlight in sync.
function goTab(name){
  currentTab=name;
  document.querySelectorAll('.nav-tab').forEach(function(t){
    var on=t.dataset.tab===name;
    t.classList.toggle('active',on);
    // The tab bar scrolls on narrow phones — keep the active tab visible
    if(on&&t.scrollIntoView)t.scrollIntoView({block:'nearest',inline:'nearest'});
  });
  window.scrollTo(0,0);
  render(true);
}

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
render(true);
