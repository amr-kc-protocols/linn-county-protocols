# Linn County EMS Protocols

Mobile-optimized prehospital medical protocol reference for AMR Linn County, Kansas. Built for field use — fast, offline-capable, no app install required.

**Live site:** https://amr-kc-protocols.github.io/linn-county-protocols/

---

## What's in the App

### Home
Landing screen with a tile grid, modelled on the AMR KC field guide. It splits into two clearly separated groups:

- **Protocols &amp; Reference** — Protocols, Formulary, Scope, Ops, MAI, and the signed PDF. Crimson accents.
- **Training &amp; Study** — the Airway &amp; RSI Academy and the Protocol Quiz. Amber accents, `Training` / `Self-test` badges, and an explicit banner stating this is study material, **not** a standing order and **not** accredited CE at this time.

The patient-weight tile sits at the top since it drives every computed dose in the app, and reflects the current patient once set. The 2026 PDF and the Quiz also live as icon buttons in the header, keeping the tab bar for app sections only.

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

### Airway &amp; RSI Academy (training)
Interactive 8-module course on emergency airway management and rapid sequence intubation — the decision to intubate, anatomic and physiologic difficult-airway prediction, preoxygenation and hemodynamic optimization, induction and paralytic agents, the intubation sequence, post-intubation care, and the failed airway. Includes in-lesson widgets (reveal, pick, ordering, calculators, branching scenarios), a module quiz gate, a final exam, and a printable certificate of completion.

Progress is stored locally in the browser (`localStorage`, key `airway_academy_v1`) — nothing is uploaded, and clearing site data resets it.

**This is training, not a protocol, and not CE credit at this time.** The academy is study material for critical care transport. It is **not** a Linn County standing order — doses taught in the course may differ from the county protocol, and the protocol governs — and it is **not** accredited continuing education at this time, so nothing in it currently counts toward license or certification renewal. Both distinctions are enforced in the UI rather than left to a footnote:

- It is reachable from the Home screen's **Training &amp; Study** section, not from the protocol tab bar.
- Its tile carries a `Training` badge and sits under a note naming it study material that carries no CE credit at this time.
- The academy page opens with a disclaimer above all content, linking back to the MAI protocol and formulary.
- The printable completion certificate carries the same wording, since a certificate is the most likely thing to be mistaken for CE documentation.
- Training uses amber throughout; protocol and reference material uses crimson.

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

## Look &amp; Feel

The app follows the county's civic identity from [linncountyks.gov](https://linncountyks.gov) — navy surfaces, crimson accents, and the maple-leaf-and-sabre mark from the county seal.

| Token | Value | Used for |
|---|---|---|
| `--navy` / `--navy-2` / `--navy-3` | `#12283F` `#1B3A5C` `#27506F` | Page, header/cards, hover |
| `--crimson` / `--crimson-br` / `--crimson-lt` | `#9B2335` `#C8394C` `#F0A2AC` | Rules, buttons, accent text |
| `--steel` / `--ice` / `--white` | `#8FA9C2` `#DCE8F3` `#FFFFFF` | Text on navy |
| `--paper` / `--paper-2` | `#F5F7FA` `#EAEFF5` | Detail and drug views |

Type is Playfair Display (headings), Source Sans 3 (body), and IBM Plex Mono (labels and doses), exposed as `--f-display` / `--f-body` / `--f-mono`. All three pages load the **same** Google Fonts URL and share one weight scale topping out at 700 — if you add a page, copy that `<link>` verbatim rather than requesting a different set of weights.

Every colour lives in the `:root` block at the top of `styles.css` — retheming the whole app means editing that block, not hunting through rules. Two categories are deliberately **excluded** from the theme and must not be restyled, because the colours carry clinical meaning:

- **Broselow tape colours** (`data.js`) — pink, purple, white, etc. are the standardised tape bands.
- **START triage colours** (`data.js`) — black / red / yellow / green are the triage categories.

Status colours (green = go, amber = caution, red = stop) are also semantic and stay recognisable rather than matching the brand.

The chrome stays dark on purpose. This is read in a dark ambulance at night, so the navy surfaces carry the lists and the detail and drug views invert to pale paper for long-form reading.

---

## File Structure

```
linn-county/
├── index.html            # Main app — protocols, formulary, scope, MAI
├── styles.css            # Shared stylesheet for both pages
├── data.js               # Protocol data, formulary, scope, OPS data
├── app.js                # Render logic and event handlers
├── sw.js                 # Service worker — offline caching
├── quiz.html             # Self-contained quiz app
├── airway-academy.html   # Self-contained Airway &amp; RSI Academy
└── vercel.json           # Vercel hosting config (caching headers)
```

---

## Updating the App

All files must be present in the same folder — they reference each other by filename.

**To update protocol content:** edit `data.js`
**To update styling or the colour scheme:** edit `styles.css` (`:root` block)
**To update quiz questions:** edit `quiz.html`
**To update academy lessons or exam questions:** edit `airway-academy.html`
**To update render logic or navigation:** edit `app.js`

### Uploading to GitHub

Use **"Add file" → "Upload files"** — drag all 7 files at once. Do **not** use the "Edit file" paste method — GitHub's web editor truncates large files and will silently corrupt the JavaScript.

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
