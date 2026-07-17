# Linn County EMS Protocols

Mobile-optimized prehospital medical protocol reference for AMR Linn County, Kansas. Built for field use — fast, offline-capable, no app install required.

**Live site:** https://amr-kc-protocols.github.io/linn-county-protocols/

---

## What's in the App

### Protocols
Searchable protocol library organized by clinical category:
- Universal Guidelines (vascular access, medication administration)
- General Medical (AMS, anaphylaxis, pain management, hypoglycemia, behavioral)
- Cardiovascular (ACS, bradycardia, tachycardia, stroke, syncope, VAD)
- Respiratory (airway management, asthma, CHF, CPAP, MAI)
- Cardiac Arrest (resuscitation, post-ROSC care, TOR, determination of death)
- Trauma (XABCDE, TBI, burns, crush, hemorrhage, SMR)
- Environmental & Toxicology (opioid OD, CO poisoning, hypothermia, TCA OD)
- Obstetrics (OB emergencies, field delivery, eclampsia)
- Pediatric (bronchiolitis, neonate resuscitation, BRUE)
- Clinical Policies (refusals, consent, restraints)

### Formulary
Complete drug reference with dosing, contraindications, and warnings for all agents in the 2026 formulary — including **Ketorolac (NEW 2025)** and **Tranexamic Acid / TXA (interim protocol, effective 9/1/2025)**.

### Scope of Practice
Visual EMT / AEMT / Paramedic scope comparison across airway, circulation, vascular access, medication routes, trauma, and other skills.

### MAI (Medication-Assisted Intubation)
Step-by-step procedure guide with an integrated **weight-based dose calculator** (kg/lbs) for ketamine, vecuronium, rocuronium, midazolam, and lidocaine IO analgesia.

### Quiz
Separate credential-level quiz app with instant feedback:
- **EMT** — 40 questions
- **AEMT** — 25 questions
- **Paramedic** — 30 questions

Covers scope, medications, MAI, clinical decision-making, and protocol specifics. Includes missed-question review and retry mode.

---

## Medical Authority

**Medical Director:** Dr. Ameet Deshmukh, MD  
**Protocol Year:** 2026  
**Agency:** AMR Linn County, Pleasanton, Kansas

All protocols represent standing medical orders authorized by the Medical Director. These are prehospital standing orders — not a substitute for Direct Medical Oversight (DMO) when required.

---

## File Structure

```
linn-county/
├── index.html    # Main app — protocols, formulary, scope, MAI
├── styles.css    # Shared stylesheet for both pages
├── data.js       # Protocol data, formulary, scope, OPS data
├── app.js        # Render logic and event handlers
├── sw.js         # Service worker — offline caching
├── quiz.html     # Self-contained quiz app
└── vercel.json   # Vercel hosting config (caching headers)
```

---

## Updating the App

All files must be present in the same folder — they reference each other by filename.

**To update protocol content:** edit `data.js`
**To update styling:** edit `styles.css`
**To update quiz questions:** edit `quiz.html`
**To update render logic or navigation:** edit `app.js`

### Uploading to GitHub

Use **"Add file" → "Upload files"** — drag all 6 files at once. Do **not** use the "Edit file" paste method — GitHub's web editor truncates large files and will silently corrupt the JavaScript.

### Deploying Updates (Cache Busting)

The service worker caches all app files on first load. When you push updated files, **bump `CACHE_VERSION`** at the top of `sw.js` (e.g. `linn-ems-v1` → `linn-ems-v2`). This forces users' browsers to fetch the new files on their next visit instead of serving the stale cached version.

---

## Deploying on Vercel

The app is a plain static site (no build step), so Vercel hosting is one-time setup:

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import the `linn-county-protocols` repository.
3. Leave every setting at its default — **Framework Preset: Other**, no build command, no output directory. Click **Deploy**.

That's it. Vercel serves the files as-is and gives you a `*.vercel.app` URL (a custom domain can be added under Project → Settings → Domains). Every push to the production branch auto-deploys within seconds; pushes to other branches get preview URLs.

The included `vercel.json` sets `Cache-Control: no-cache` on `sw.js` so browsers always check for a new service worker — updates still require the `CACHE_VERSION` bump described above, but they'll never be blocked by a stale `sw.js` itself.

All asset paths in the app are relative, so GitHub Pages and Vercel can run side by side from the same repo.

---

## Offline Support

The app uses a service worker (`sw.js`) to cache all files on first load — protocols, formulary, quiz, styles, and Google Fonts. After that first visit the app works fully offline, with no network required. The service worker is registered automatically by both `index.html` and `quiz.html`.

---

## Notes

- No backend, no database, no dependencies beyond Google Fonts
- Full offline support via service worker after first load
- Optimized for iOS Safari on iPhone (primary use case)
- All special characters in JavaScript are encoded as HTML entities to ensure safe copy-paste across editors
