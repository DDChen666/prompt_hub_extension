# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "Prompt Organizer (MVP)" that helps users manage and quickly insert frequently used text prompts. The extension features:

- **Overlay Panel**: Injected into web pages via keyboard shortcut (Cmd/Ctrl+Shift+K)
- **Popup Interface**: Quick access to prompts with search functionality
- **Options Page**: Full management interface with site policies and feature flags
- **Storage**: Uses Chrome's local storage with Zod schema validation
- **Site Policies**: Allowlist/Blocklist/Copy-only functionality for domain control
- **Feature Flags**: Disable Overlay/Disable LLM/Readonly modes as safety features

## Key Architecture Components

### Core Modules
- `src/background/index.ts`: Service worker handling commands, site policy checks, and overlay injection
- `src/content/index.ts`: Content script entry (currently placeholder)
- `src/lib/storage/indexed.ts`: Storage management with Zod validation and in-memory caching
- `src/contracts/schemas.ts`: Zod schemas for data validation
- `src/popup/App.tsx`: Popup UI with search and copy functionality
- `src/options/App.tsx`: Options page for full management

### Storage Schema
- `prompt_items_v1`: Array of PromptItem objects
- `site_policy_v1`: SitePolicy for domain allow/block/copy-only lists
- `feature_flags_v1`: Feature flags for safety controls
- Gemini API key and model preferences

### Build System
- **Vite** with CRXJS plugin for Chrome extension building
- **TypeScript** with strict type checking
- **Zod** for runtime validation
- **React** for UI components

## Development Commands

### Build and Development
```bash
# Development mode
pnpm dev

# Production build
pnpm build

# Build and create zip package
pnpm build && pnpm guard && pnpm zip

# Manifest validation (security check)
pnpm guard
```

### Testing
```bash
# Run unit tests
pnpm test
pnpm test:unit

# Run E2E tests with Playwright
pnpm test:e2e

# Run specific test file
pnpm test -- tests/unit/storage.spec.ts
```

### Code Quality
```bash
# Lint code
pnpm lint

# Type checking
pnpm typecheck
```

### Release Process
```bash
# Generate release notes
pnpm run release:notes

# Generate SHA256 checksum
pnpm run release:sha

# Create git tag
git tag v0.1.0 && git push origin v0.1.0
```

## Key Files and Locations

- `extension/manifest.json`: Chrome extension manifest
- `extension/vite.config.ts`: Vite configuration with CRXJS plugin
- `extension/tsconfig.json`: TypeScript configuration
- `extension/playwright.config.ts`: Playwright E2E test configuration
- `extension/scripts/manifest-guard.mjs`: Security check for manifest permissions

## Security Features

- **Manifest Guard**: Validates manifest permissions to prevent unauthorized access
- **Site Policies**: Domain-based allow/block/copy-only controls
- **Feature Flags**: Emergency disable switches for critical functionality
- **Schema Validation**: All storage operations validated with Zod
- **Backup System**: Automatic backups on schema validation failures

## Testing Strategy

- **Unit Tests**: Located in `tests/unit/` covering storage, search, schemas
- **E2E Tests**: Located in `tests/e2e/` using Playwright for overlay testing
- **Test Data**: Seed data automatically created on first install

## Deployment

1. Build: `pnpm build && pnpm guard && pnpm zip`
2. Load unpacked extension from `dist/` directory
3. Set keyboard shortcut in Chrome extensions settings
4. Configure site policies in Options page as needed

## Important Notes

- The extension uses Chrome Manifest V3
- All storage operations are validated with Zod schemas
- Site policies provide granular control over where the overlay appears
- Feature flags act as emergency shutoff switches
- The overlay injects directly into pages using `chrome.scripting.executeScript`