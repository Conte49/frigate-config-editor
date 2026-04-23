# Frigate Config Editor — MVP Spec

**Nome progetto:** `frigate-config-editor`
**Tipo:** Home Assistant Custom Panel (distribuito via HACS)
**Autore:** Nicola (WeCan Consulting)
**Target utenti:** utenti HA con Frigate 0.15+ che vogliono gestire il config YAML senza editarlo a mano
**Repository:** `github.com/<user>/frigate-config-editor`

---

## 1. Obiettivo

Fornire un'interfaccia grafica integrata in Home Assistant per modificare il file `config.yml` di Frigate, eliminando la necessità di editare il YAML a mano. L'editor genera form dinamici a partire dal JSON Schema che Frigate espone, valida le modifiche lato server (via API Frigate) e applica la config senza dover riavviare manualmente l'add-on.

## 2. Scope MVP (cosa c'è e cosa non c'è)

### ✅ Dentro MVP
- Lettura della config corrente dall'istanza Frigate via API REST
- Form editor per le sezioni principali: `cameras`, `record`, `detect`, `objects`, `motion`, `go2rtc`
- Validazione live (schema JSON Frigate)
- Salvataggio con restart automatico di Frigate
- Backup automatico della config precedente in LocalStorage (ultime 10 versioni)
- Diff view prima del salvataggio (vecchio vs nuovo YAML)
- Fallback a editor YAML raw (Monaco editor) per sezioni non coperte dai form
- Auto-discovery delle istanze Frigate connesse a HA (via integrazione Frigate esistente)

### ❌ Fuori MVP (roadmap futura)
- Editor grafico per zone di rilevamento (disegno poligoni su snapshot camera)
- Wizard "add camera" con test stream live
- Gestione detectors (Coral, OpenVINO, TensorRT)
- Editor per `semantic_search`, `genai`, `face_recognition` (feature 0.16+)
- Multi-istanza con sync config
- Templates pre-built per modelli Reolink/Hikvision/Dahua comuni
- Import da Surveillance Station / Blue Iris / MotionEye

---

## 3. Architettura

### 3.1 Stack tecnico

| Componente | Scelta | Motivazione |
|------------|--------|-------------|
| Framework UI | **Lit 3** + TypeScript | Standard HA custom panels, lightweight |
| Form engine | **@rjsf/core 5** (react-jsonschema-form adattato a Lit via wrapper) O **@jsforms/core** | Genera form da JSON Schema automaticamente |
| YAML parsing | `js-yaml` | De-facto standard |
| Editor raw | `@monaco-editor/loader` | VS Code in browser |
| Diff viewer | `diff2html` | Rendering diff leggibile |
| Build | **Vite** + `rollup-plugin-typescript2` | Output ES module singolo per HA |
| Packaging HACS | `hacs.json` + `info.md` | Distribuzione standard HACS |

**Alternativa considerata:** React + shadcn/ui. Scartata perché i custom panel HA preferiscono Lit per coerenza con il frontend ufficiale (minor footprint, no hydration overhead).

### 3.2 Integrazione con Home Assistant

Il componente viene registrato come **Custom Panel** in HA (non come integrazione Python). Questo semplifica l'installazione: solo frontend, nessun backend Python da mantenere.

```yaml
# configuration.yaml (automatico via HACS)
panel_custom:
  - name: frigate-config-editor
    sidebar_title: Frigate Config
    sidebar_icon: mdi:cog-outline
    url_path: frigate-config
    module_url: /hacsfiles/frigate-config-editor/frigate-config-editor.js
    embed_iframe: false
    require_admin: true
```

### 3.3 Comunicazione con Frigate

Tutta la comunicazione avviene **direttamente browser → Frigate API** (no proxy via HA), usando l'URL interno dell'add-on già noto all'integrazione Frigate HA.

**Endpoint Frigate utilizzati (tutti esistenti, verificati su Frigate 0.15+):**

| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/api/config/schema.json` | GET | Schema JSON per generare form |
| `/api/config` | GET | Config corrente parsata (JSON) |
| `/api/config/raw` | GET | Config YAML raw |
| `/api/config/save` | POST | Salva + valida config |
| `/api/restart` | POST | Riavvia Frigate |
| `/api/version` | GET | Check compatibilità (≥ 0.15) |

**Discovery istanza Frigate:**
- Legge `hass.states` cercando entità `binary_sensor.*_camera_fps` (generate dall'integrazione Frigate)
- Estrae device_info per trovare l'URL base dell'istanza
- Fallback: input manuale URL

---

## 4. UX / Flussi

### 4.1 Schermata principale

```
┌─────────────────────────────────────────────────────────────┐
│ 🎥 Frigate Config Editor            [Frigate 0.16.1 ✓]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─ Sidebar ────────┐  ┌─ Editor ────────────────────────┐  │
│ │ 🔧 Globali       │  │  📹 Cameras > ingresso          │  │
│ │                  │  │                                  │  │
│ │ 📹 Cameras (6)   │  │  Name: [ingresso        ]       │  │
│ │   • ingresso  ● │  │  Enabled: [✓]                   │  │
│ │   • porta_ing ● │  │                                  │  │
│ │   • giardino  ● │  │  ── FFmpeg ──                   │  │
│ │   • laterale  ● │  │  Inputs:                         │  │
│ │   • soggiorno ● │  │   [+] Detect stream             │  │
│ │   • garage    ● │  │     Path: [http://192.168...]  │  │
│ │   [+ Add]        │  │     Preset: [preset-http-reo]▼│  │
│ │                  │  │                                  │  │
│ │ 💾 Record        │  │   [+] Record stream             │  │
│ │ 🎯 Objects       │  │     ...                          │  │
│ │ 🚨 Motion        │  │                                  │  │
│ │ 🌐 go2rtc        │  │  ── Detect ──                   │  │
│ │ 🗄 Database      │  │  Enabled: [ ]                    │  │
│ │                  │  │  Width: [640] Height: [480]      │  │
│ │ ── Advanced ──   │  │                                  │  │
│ │ 📝 Raw YAML      │  │  ── Record ──                   │  │
│ │ 📜 History       │  │  Enabled: [✓]                   │  │
│ │                  │  │  Continuous days: [14]           │  │
│ └──────────────────┘  │  Motion days:     [0]            │  │
│                       │                                    │  │
│                       │  [ 💾 Save Changes ] [🔄 Discard] │  │
│                       └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Flusso "Modifica camera esistente"

1. Utente clicca camera da sidebar
2. Form popolato con valori correnti (da `GET /api/config`)
3. Validazione live mentre digita (regole da schema JSON)
4. Click **Save**:
   - Genera nuovo YAML (merge con config esistente)
   - Mostra **diff modal** (vecchio vs nuovo)
   - Utente conferma
   - `POST /api/config/save` con body `{ config: <yaml_string>, save_option: "restart" }`
   - Se validazione server OK → Frigate si riavvia → poll `/api/version` fino a risposta 200
   - Toast di successo, config ricaricata
   - Se errore → mostra messaggio errore Frigate inline, config NON salvata

### 4.3 Flusso "Fallback Raw YAML"

Per feature non coperte dai form, pulsante "Edit Raw YAML" apre Monaco editor con:
- Syntax highlighting YAML
- Schema validation live (usa `$schema` riferimento inline)
- Autocompletamento
- Stesso flusso Save/Diff/Restart

### 4.4 Flusso "Cronologia modifiche"

Ogni save viene committato in LocalStorage con timestamp. Pulsante "History" mostra lista:
- Data/ora
- Riassunto cambiamenti (es. "Modified camera: ingresso (record.continuous.days: 7 → 14)")
- Diff completo
- **Restore** (non applica automaticamente, carica nel form per review)

---

## 5. Modelli dati

### 5.1 TypeScript types principali

```typescript
// Config Frigate (subset MVP — resto via index signature)
interface FrigateConfig {
  cameras: Record<string, CameraConfig>;
  record?: RecordConfig;
  detect?: DetectConfig;
  objects?: ObjectsConfig;
  motion?: MotionConfig;
  go2rtc?: Go2RtcConfig;
  mqtt?: MqttConfig;
  database?: { path: string };
  version: string;
  [key: string]: unknown; // passthrough campi non gestiti da UI
}

interface CameraConfig {
  enabled: boolean;
  ffmpeg: {
    inputs: FFmpegInput[];
    hwaccel_args?: string;
    input_args?: string;
    output_args?: Record<string, string>;
  };
  detect?: DetectConfig;
  record?: RecordConfig;
  objects?: ObjectsConfig;
  motion?: MotionConfig;
  zones?: Record<string, ZoneConfig>;
  snapshots?: SnapshotConfig;
}

interface FFmpegInput {
  path: string;
  roles: Array<"detect" | "record" | "audio">;
  input_args?: string; // preset o stringa custom
}

interface RecordConfig {
  enabled: boolean;
  continuous?: { days: number };
  motion?: { days: number };
  alerts?: { retain: { days: number } };
  detections?: { retain: { days: number } };
}

// ...altri tipi per Detect, Objects, Motion, Zone, ecc.

// History
interface ConfigSnapshot {
  id: string;        // uuid
  timestamp: number;
  yaml: string;
  summary: string;   // "Modified: cameras.ingresso.record.continuous.days"
  author?: string;   // user HA
}
```

### 5.2 Storage locale (LocalStorage)

```json
{
  "frigate-editor:history": [
    { "id": "...", "timestamp": 1714000000, "yaml": "...", "summary": "..." }
  ],
  "frigate-editor:settings": {
    "preferred_instance": "ccab4aaf_frigate",
    "default_retention_days": 14,
    "show_advanced_fields": false
  }
}
```

Max 10 snapshot, rotazione FIFO, compressione con `pako.deflate` per non saturare quota LocalStorage (5 MB).

---

## 6. Implementazione — moduli

```
src/
├── index.ts                    # entry point (registra custom element)
├── frigate-config-editor.ts    # root component
├── lib/
│   ├── frigate-api.ts          # wrapper API Frigate
│   ├── ha-integration.ts       # lettura states HA, discovery
│   ├── yaml-utils.ts           # serialize/parse/merge YAML preservando commenti
│   ├── schema-loader.ts        # carica + normalizza JSON schema
│   ├── history-store.ts        # CRUD LocalStorage
│   └── diff.ts                 # diff YAML
├── components/
│   ├── sidebar.ts
│   ├── camera-editor.ts
│   ├── record-editor.ts
│   ├── objects-editor.ts
│   ├── motion-editor.ts
│   ├── go2rtc-editor.ts
│   ├── raw-yaml-editor.ts      # Monaco wrapper
│   ├── diff-modal.ts
│   ├── history-panel.ts
│   └── shared/
│       ├── field-text.ts
│       ├── field-number.ts
│       ├── field-select.ts
│       ├── field-list.ts       # lista dinamica (add/remove item)
│       └── validation-badge.ts
├── styles/
│   └── theme.ts                # CSS variables HA-aware (dark/light)
└── types/
    └── frigate.ts              # interfaces
```

### 6.1 Decisioni critiche di implementazione

**Preservare commenti YAML durante edit:**
`js-yaml` non preserva commenti. Per l'MVP accettiamo la perdita dei commenti del file originale ma aggiungiamo un header auto-generato:
```yaml
# Managed by Frigate Config Editor — last edit: 2026-04-23T16:30:00+02:00
# WARNING: edits via raw editor are preserved, but comments may be stripped on save
```
Post-MVP valutare `yaml` npm package (alternativa che supporta CST con commenti).

**Merge config:**
Read-modify-write completo. NO merge parziale. Questo previene race condition se Frigate ha cambiato la config da altro editor.

**Gestione errori validazione Frigate:**
Frigate restituisce errori in formato:
```json
{
  "success": false,
  "message": "Your configuration is invalid...\nLine 25: cameras -> ingresso -> record -> unknown_field"
}
```
Parser regex estrae `Line N:` e `field path` per evidenziare inline nel form.

**Performance:**
- Config Frigate grande (100+ camere) rara, ma form con 20+ campi per camera può diventare lento con binding live. Usare `@eventOptions({ passive: true })` sugli handler, debounce validation 300ms.

---

## 7. Testing

### 7.1 Strategia

| Tipo | Tool | Coverage target |
|------|------|-----------------|
| Unit (utils, parsers) | Vitest | ≥ 80% |
| Component | @open-wc/testing + Playwright | smoke test ogni editor |
| E2E | Playwright contro mock Frigate API | flussi critici (save, restart, discard) |
| Visual regression | Chromatic (opzionale) | futuro |

### 7.2 Mock Frigate

Creare `mock-frigate-server.ts` — Express server che risponde agli endpoint Frigate con fixture realistiche. Usato nei test E2E e in dev locale senza bisogno di HA installato.

### 7.3 Test su Frigate reale

Pre-release: installare su istanza HA di test con Frigate reale (puoi usare la tua attuale). Checklist:
- [ ] Discovery istanza
- [ ] Load config corrente (6 camere)
- [ ] Modifica retention camera → save → restart → verifica su Frigate UI
- [ ] Aggiunta camera nuova via form
- [ ] Save con YAML invalido → errore gestito
- [ ] Rollback da History
- [ ] Dark mode + light mode + mobile viewport

---

## 8. Packaging HACS

### 8.1 File richiesti

```
frigate-config-editor/
├── hacs.json              # metadati HACS
├── info.md                # descrizione mostrata in HACS
├── README.md              # istruzioni complete
├── LICENSE                # MIT
├── dist/
│   └── frigate-config-editor.js   # bundle finale (output Vite)
└── .github/
    └── workflows/
        └── release.yml    # auto-build + release tag
```

### 8.2 `hacs.json`

```json
{
  "name": "Frigate Config Editor",
  "render_readme": true,
  "content_in_root": false,
  "filename": "frigate-config-editor.js",
  "homeassistant": "2024.6.0"
}
```

### 8.3 Release workflow

Tag semver `v0.1.0` → GitHub Action:
1. Build con `pnpm build`
2. Crea release con `dist/frigate-config-editor.js` come asset
3. HACS pesca automaticamente l'ultimo tag

---

## 9. Milestone roadmap

| Milestone | Durata stimata | Deliverable |
|-----------|----------------|-------------|
| **M0 — Setup** | 2 giorni | Repo, Vite config, HACS boilerplate, CI |
| **M1 — Core API** | 3 giorni | `frigate-api.ts` + discovery HA + types completi |
| **M2 — Editor Cameras** | 5 giorni | CameraEditor con form dinamici + save funzionante |
| **M3 — Raw YAML + Diff + History** | 3 giorni | Monaco editor integrato + diff modal + LocalStorage |
| **M4 — Editor Record/Objects/Motion/go2rtc** | 4 giorni | Completamento form altre sezioni |
| **M5 — UX polish + Dark mode + mobile** | 2 giorni | Stili HA-native, responsive |
| **M6 — Testing + docs** | 3 giorni | Unit + E2E + README + screenshot |
| **M7 — Release v0.1.0** | 1 giorno | Tag, pubblicazione HACS |

**Totale:** ~23 giorni / 4-5 settimane part-time, 2-3 settimane full-time.

---

## 10. Rischi & mitigazioni

| Rischio | Impatto | Mitigazione |
|---------|---------|-------------|
| Schema Frigate cambia tra versioni 0.15/0.16/0.17 | Alto | Parser schema-agnostic, mostra warning se feature non supportata dalla versione |
| Commenti YAML persi su save | Medio | Warning chiaro in UI + post-MVP migrate a `yaml` package |
| Race condition (config editata da altro tool durante edit) | Medio | Checksum config al load, check pre-save, alert se cambiato |
| HACS rifiuta la PR (validazione) | Basso | Testare con `hacs-action` nelle CI prima della release |
| Utenti confusi da dual-mode form/raw | Medio | Tooltip, onboarding al primo avvio, disable raw fino a checkbox "advanced mode" |
| Bug di save che corrompe config → Frigate non parte | **Alto** | **Auto-backup config su HA /config/ prima di ogni save**, pulsante "Restore last working" sempre visibile |

---

## 11. Appendice — JSON Schema Frigate

Frigate espone lo schema completo a:
```
http://<frigate>:5000/api/config/schema.json
```

Esempio struttura (Frigate 0.16):
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FrigateConfig",
  "type": "object",
  "properties": {
    "cameras": {
      "type": "object",
      "additionalProperties": { "$ref": "#/$defs/CameraConfig" }
    },
    "record": { "$ref": "#/$defs/RecordConfig" },
    ...
  },
  "$defs": {
    "CameraConfig": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "ffmpeg": { "$ref": "#/$defs/CameraFfmpegConfig" },
        ...
      },
      "required": ["ffmpeg"]
    },
    ...
  }
}
```

Lo schema contiene: titoli, descrizioni, default, enum, pattern, range numerici — tutto quello che serve per generare form auto.

---

## 12. Prompt di lancio per Claude Code

Quando sarà il momento di implementare, usare questo prompt iniziale:

```
Sei un senior frontend engineer specializzato in custom components per Home Assistant.

Implementa l'MVP descritto in MVP_SPEC.md seguendo questa strategia:

1. Inizia dal Milestone M0 — setup del repo con Vite + Lit + TypeScript
2. Procedi sequenzialmente M1 → M7 senza skippare step
3. Ad ogni milestone: commit con messaggio "feat(mX): <sintesi>"
4. Scrivi test unit per ogni modulo lib/ appena creato
5. NON installare dipendenze non presenti nello stack tecnico del documento
6. Usa SOLO gli endpoint Frigate listati al §3.3
7. Per ogni decisione di design non coperta dallo spec, documentala in DECISIONS.md e procedi

Prima di iniziare:
- Verifica versione Node >= 20
- Inizializza pnpm workspace
- Crea struttura directory come da §6
```

---

**Fine spec.**
