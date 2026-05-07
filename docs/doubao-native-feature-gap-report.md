# Doubao Native Reverse Analysis and Local Gap Report

## Scope and Method
- Native target: `D:/Doubao/app` with runtime entry `D:/Doubao/app/Doubao.exe`.
- Local target: `D:/Doubao/refactored`.
- Focused capabilities: chat + document parsing + multimodal, follow-up generation, OCR/PDF flow, web extraction scheduling, text-picker/context menu, UI panel integration.
- Evidence sources:
  - Local implementation code paths.
  - Native app runtime artifacts (`manifest.json`, `debug.log`, local web bundle manifests/config).
  - Dynamic process observation (launch behavior and process inventory).

## 1) Local Baseline Map (Current Implementation)

### A. Chat and follow-up question flow
- Web entry + attachment injection: `packages/web/src/app/page.tsx`.
- Chat orchestration + streaming + stop + follow-up generation: `packages/web/src/hooks/useOllamaChat.ts`.
- Ollama adapter and abort handling: `packages/core/src/utils/ollama-client.ts`.

### B. File parsing and multimodal document path
- Parser registry and parser selection: `packages/core/src/document-parsers/document-parser-registry.ts`.
- PDF parser (pdfjs extraction -> simple scan -> LinkMind/Ollama OCR fallback): `packages/core/src/document-parsers/pdf-document-parser.ts`.
- Multi-format service bridge: `packages/core/src/services/multi-format-support-service.ts`.
- Multimodal analysis service: `packages/core/src/services/multimodal-content-analysis-service.ts`.

### C. Web content extraction and multi-engine scheduling
- HTTP extraction service: `packages/core/src/services/web-content-extraction-service.ts`.
- Scheduler and fallback order: `packages/core/src/services/multi-engine-scheduler-service.ts`.
- JS-heavy service (Node path): `packages/core/src/services/js-heavy-web-processing-service.ts`.

### D. Text picker and context menu
- Picker implementation and events: `packages/core/src/utils/text-picker.ts`.
- Picker action types: `packages/core/src/types/text-picker.ts`.
- Web integration listeners: `packages/web/src/app/page.tsx`.

### E. UI panel surface
- Main panel orchestration in `packages/web/src/app/page.tsx`.
- Multiple feature panels mounted via booleans and window events.

## 2) Native Runtime Evidence (Observed)

### A. Binary/runtime footprint
- Native package is Chromium-style desktop app (multi-process renderer/gpu/utility) with:
  - `Doubao.exe`, `Doubao.dll`, `resources.pak`, subprocess proxies.
- `app/manifest.json` shows:
  - product `Doubao`
  - version `2.7.6`
  - commit id `0635ecfc85b3c7de3bfe63adcefc41d5ccaa60f7`

### B. Embedded web extension artifacts
- `app/local_webcontents/extensions/ai-views/manifest.json` indicates:
  - MV3 extension architecture.
  - side panel + popup + content scripts.
  - host permissions on all urls.
  - externally connectable to `*.doubao.com`, `*.cici.com`, `*.dola.com`, etc.
- `app/local_webcontents/extensions/ai-views/modern.config.json` indicates:
  - Build type online/production.
  - Product domain `www.doubao.com`.
  - Feature flags enabled in native bundle include:
    - `FEATURE_ENABLE_PDF_IMMERSIVE_READING`
    - `FEATURE_ENABLE_DEEP_SEARCH`
    - `FEATURE_REGEN_BETTER_OR_WORSE`
    - `FEATURE_TRANS_PREFER_LANG`
    - `FEATURE_ENABLE_IMAGE_EDIT`
    - `FEATURE_ENABLE_THREAD_HEADER`
    - `FEATURE_MULTIPLE_LLM`
    - many chat/bot/profile switches.

### C. Dynamic launch/process evidence
- Launching `D:/Doubao/app/Doubao.exe` succeeds quickly and returns (single-instance behavior).
- Runtime process list confirms active `Doubao.exe` process.
- `app/debug.log` confirms Chromium multi-process launch parameters and repeated utility/renderer startup.

## 3) Native -> Local Capability Mapping and Gaps

## High Priority Gaps

### Gap H1: Missing native-style capability matrix/feature toggles
- Native evidence: extensive runtime feature switches in `modern.config.json`.
- Local state: no unified feature-gate layer in web app entry; behavior is mostly hardcoded in `page.tsx` + individual hooks/services.
- Risk:
  - hard to keep parity as capabilities evolve.
  - panel behavior diverges from native gating.
- Fix direction:
  - add centralized capability config service in core/web (`feature flags` + defaults + env overrides).
  - gate follow-up, OCR path, deep-search/web tools, thread header style, image edit entry points.

### Gap H2: Web extraction stack shape mismatch
- Native evidence: extension-heavy architecture (background/content/side-panel split) with rich web capability surface.
- Local state: `WebContentExtractionService` currently basic; scheduler exists but adapter fidelity is low.
- Risk:
  - behavior drift for dynamic pages and extraction reliability.
- Fix direction:
  - normalize `ExtractionResult` schema to include source engine, fallback trace, confidence.
  - enrich `handleHttp` and scheduler fallback telemetry.
  - add integration path between `web-content-extraction-service` and `web-content-extraction-pipeline`.

### Gap H3: OCR and PDF flow lacks explicit policy layer
- Native evidence: explicit PDF-related feature flags (`FEATURE_ENABLE_PDF_IMMERSIVE_READING`).
- Local state: PDF parser has multiple fallback paths, but policy decisions are embedded in parser logic.
- Risk:
  - hard to mirror native behavior knobs (immersive reading on/off, OCR strategy variants).
- Fix direction:
  - introduce `PdfProcessingPolicy` config object (text-first/ocr-first/immersive-reading flags).
  - centralize timeout/retry strategy for LinkMind and Ollama OCR calls.

## Medium Priority Gaps

### Gap M1: Follow-up question pipeline has weak structured contract
- Local state: follow-up generation is heuristic + JSON parse fallback; default questions are set eagerly.
- Risk:
  - inconsistent UX under model variability.
- Fix direction:
  - introduce strict parser/validator for follow-up payload (category enum + priority bounds).
  - add telemetry points for timeout, parse failure, fallback usage.

### Gap M2: Text-picker action model not fully integrated with panel command bus
- Native evidence: extension architecture suggests command-oriented orchestration.
- Local state: custom window events are used directly in `page.tsx`.
- Risk:
  - coupling and event drift.
- Fix direction:
  - centralize picker events through a typed event bus adapter in core.
  - map action IDs to panel commands in one registry.

### Gap M3: UI panel orchestration in single page entry
- Local state: `page.tsx` has a large amount of panel toggling and event glue.
- Risk:
  - difficult parity updates and regression risk.
- Fix direction:
  - extract panel router/state machine (`panelId`, `open/close`, payload).
  - move global event wiring to dedicated hook/module.

## Low Priority Gaps

### Gap L1: Incomplete native-grade telemetry/diagnostic parity
- Native artifacts show mature telemetry/instrumentation hooks.
- Local stack has logger + some diagnostics, but no end-to-end feature-level trace model.
- Fix direction:
  - add lightweight structured trace IDs across chat/file/ocr/web extraction flows.

## 4) PR-Oriented Implementation Backlog (Actionable)

### PR-1: Capability Flag Layer (core + web)
- Files:
  - `packages/core/src/services/feature-capability-service.ts` (new)
  - `packages/core/src/index.ts` (export)
  - `packages/web/src/app/page.tsx` (consume)
  - `packages/web/src/hooks/useOllamaChat.ts` (consume where relevant)
- Outcome:
  - central toggles for follow-up, OCR strategy, deep-search tooling, picker-related features.

### PR-2: Extraction Result Normalization and Scheduler Trace
- Files:
  - `packages/core/src/services/web-content-extraction-service.ts`
  - `packages/core/src/services/multi-engine-scheduler-service.ts`
  - `packages/core/src/services/web-content-extraction-pipeline.ts`
- Outcome:
  - richer extraction metadata and deterministic fallback reporting.

### PR-3: PDF/OCR Policy Refactor
- Files:
  - `packages/core/src/document-parsers/pdf-document-parser.ts`
  - `packages/core/src/services/multi-format-support-service.ts`
  - `packages/core/src/types/document.ts` (policy-related type additions if needed)
- Outcome:
  - policy-driven OCR path selection and consistent timeout/retry policy.

### PR-4: Follow-Up Contract Hardening
- Files:
  - `packages/web/src/hooks/useOllamaChat.ts`
  - optional utility: `packages/web/src/utils/followup-parser.ts` (new)
- Outcome:
  - strict schema validation, cleaner fallback behavior, easier regression tests.

### PR-5: Text-Picker Event Bus Consolidation
- Files:
  - `packages/core/src/utils/text-picker.ts`
  - `packages/web/src/app/page.tsx`
  - `packages/core/src/utils/event-bus.ts` (if extension needed)
- Outcome:
  - single registry from picker actions to application commands.

## 5) Confidence and Constraints
- This report is based on:
  - deterministic local source inspection
  - deterministic native artifact inspection
  - process-level runtime observation
- Deep network/API parity was constrained by lack of interactive instrumented capture in this pass (no full request/response stream extraction from active native sessions).
- Recommendation:
  - next pass should capture one real user session via proxy/devtools instrumentation and append endpoint-level diffs.
