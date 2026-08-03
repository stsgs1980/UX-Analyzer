# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/)
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.2.0] - 2026-07-15

### Added

- Initial build of UX Analyzer with 7 AI analysis methodologies: Design Teardown, Deconstruction, Spec Extraction, Pattern Mining, Reverse Engineering, UX Audit, Heuristic Evaluation
- SSE streaming API endpoint with 5-step real-time progress (Page Reader, Web Search, AI Analysis, Processing, Complete)
- Prompt system supporting single-URL and batch multi-URL analysis modes
- Zustand store for full client state management (URL input, progress tracking, results, history)
- Multi-URL input component with badge display, validation, and Enter key support
- Analysis progress component with 5-step visual progress bar
- Analysis results component with tabbed rendering for all 7 methodology outputs
- Analysis history component with persistent storage and instant result reload
- History delete functionality (individual item delete and clear-all)
- Hover detail expansion on methodology index items via CSS grid animation
- JSON export (copy to clipboard and download as file)
- Responsive layout for desktop and mobile
- Scroll-reveal animations on page elements

### Changed

- Hero page redesigned with macro-typography (static) style: massive clamp-based headline, typographic methodology index, minimal outline-only interactive elements
- URL input and button styling updated to transparent border-only aesthetic
- Global CSS updated with font smoothing, selection color, and simplified background gradient

### Fixed

- Scroll-reveal hook fixed from container-ref approach to global querySelectorAll
- 4 JSX syntax errors (missing closing braces) resolved
- Unused ESLint disable directive removed