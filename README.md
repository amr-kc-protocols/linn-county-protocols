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

### Search
One search across protocols, medications, scope and operations — results are grouped by type and ranked, so a drug name leads with the drug rather than a protocol that happens to mention it. It searches from any tab; clearing it returns you to that tab.

Protocol bodies are HTML, so they are stripped before indexing — searching `div` or `span` used to return nearly every protocol. Matches in body text must start at a word boundary, so "versed" no longer matches "reversed".

An alias table maps what a medic types to what the content says: brand names for drugs on the formulary (`narcan` → Naloxone, `versed` → Midazolam, `zemuron` → Rocuronium), common shorthand (`cva` → Stroke, `heart attack` → ACS), and `rsi` → the MAI protocol, since that is what Linn calls it. Aliases are covered by tests, including one asserting every alias target actually exists in the content — a typo would otherwise send a search silently nowhere.

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

**Formulary reconciliation.** The course teaches critical care transport RSI; Linn County's MAI protocol is narrower, so the two do not agree on every agent. Rather than rewriting the clinical teaching — the reasoning behind choosing between agents is the point of the course, and those drugs turn up on interfacility transfers — the differences are stated wherever a dose appears:

| Agent | Course teaches | Linn County 2026 |
|---|---|---|
| Ketamine | 1–2 mg/kg | MAI induction **1–1.5 mg/kg**, PM |
| Rocuronium | **1.2 mg/kg**, and calls 0.6 mg/kg the common error | MAI **1 mg/kg** (formulary 0.5–1), extended formulary, PM |
| Vecuronium | not covered | **Linn's primary NMBA** — 0.1 mg/kg, PM |
| Succinylcholine / Etomidate / Propofol | taught in full | **not carried** |
| Midazolam | post-intubation sedation | MAI maintenance 2.5–5 mg |
| Sugammadex | 16 mg/kg reversal | not available prehospital |

Three places carry this:

1. A **crosswalk panel** under the training notice, before any lesson content.
2. The **RSI dose calculator**, which now prints the Linn dose beside its own for every agent, marks the three Linn does not carry, and adds a vecuronium row the course otherwise omits.
3. **Inline notes** at the three points where the course actively teaches rocuronium 1.2 mg/kg — the highest-risk conflict, since it is 20% above the Linn maximum and the course explicitly calls the lower dose a mistake.

Rocuronium is the one to watch on any future content update.

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

## Tests

The app computes medication doses from patient weight, and two dose bugs have already shipped and been fixed by hand (`3665df6` "Never render a nonzero dose as zero", `274f664` "Cap pediatric weight-based doses at the adult dose"). Both are pinned as regression tests.

```
npm test
```

No dependencies — the suite uses `node:test` and `node:assert` only, and runs on every push and pull request via `.github/workflows/test.yml`.

`test/load.js` evaluates `data.js` and `app.js` in a Node sandbox with a stub DOM, so the real dose functions are tested rather than a copy. Alongside the two regressions it checks, across a neonate-to-bariatric weight range, that every rule in `PT_CALC`:

- renders a usable string (never `NaN`, empty, or `undefined`),
- never renders a zero dose — `0 mg` reads as "give none" and is always a bug,
- never *decreases* as patient weight increases,
- stops at its ceiling where one is declared.

Plus Broselow tape ordering, and that every protocol has the fields the UI renders with unique ids.

`test/search.test.js` covers the search index: markup never matches, every formulary drug is findable by name, brand aliases resolve to the right generic, word order doesn't matter, and the query is AND rather than OR.

**If you change a dose, run the tests.** If one fails, assume the dose is wrong before assuming the test is.

---

## Install (PWA)

`manifest.json` makes the app installable — "Add to Home Screen" gives the county badge icon and a standalone window rather than a browser tab. Icons are generated from the same maple-leaf-and-sabre mark as the favicon:

| File | Use |
|---|---|
| `icon-192.png` / `icon-512.png` | Android / desktop install |
| `icon-maskable-512.png` | Android adaptive icon (mark inset to the safe zone) |
| `apple-touch-icon.png` | iOS home screen |

All are precached by the service worker, so a freshly installed app works offline immediately.

---

## Accessibility

- Skip link to the content on both pages.
- The tab bar is a real `tablist` — arrow keys, `Home`/`End`, and `aria-selected` kept in sync.
- Protocol and Ops cards are keyboard-operable (`Enter` / `Space`) and named for screen readers. They were previously `div`s with click handlers, unreachable by keyboard.
- The detail overlay is a modal dialog: focus moves to the back button on open and returns to the card that opened it on close.
- Tab switches and search results are announced through a polite live region ("12 results for epi").
- Controls whose meaning is carried by icon or colour have text labels — the clear button, the Broselow swatches, and quiz answers, which now say "correct answer" / "your answer, incorrect" rather than relying on green and red.

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
├── manifest.json         # PWA manifest — install metadata and icons
├── icon-*.png            # Install icons (192, 512, maskable, apple-touch)
├── test/                 # Dose math tests — `npm test`
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

Use **"Add file" → "Upload files"** — drag the app files at once. Do **not** use the "Edit file" paste method — GitHub's web editor truncates large files and will silently corrupt the JavaScript.

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
