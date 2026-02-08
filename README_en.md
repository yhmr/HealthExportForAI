<div align="center">
  <img src="assets/icon.png" width="120" alt="Health Export For AI Logo" />
  <h1>Health Export For AI</h1>
  <p>
    <strong>Export Health Connect data for AI analysis</strong>
  </p>
  <p>
    <a href="./README.md">日本語 (Japanese)</a> | 
    <a href="https://yhmr.github.io/HealthExportForAI/">Official Site</a> | 
    <a href="https://yhmr.github.io/HealthExportForAI/privacy/">Privacy Policy</a>
  </p>
</div>

<div align="center">

![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square)
![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square)

</div>

An Android application built with React Native + Expo. It reads health data from Health Connect and exports it to Google Drive in flexible formats (Google Sheets, PDF, CSV, JSON) for analysis with AI tools like NotebookLM.

## Key Features

- **Health Connect Integration**: Unified access to steps, heart rate, sleep, and more.
- **Google Drive Sync**: Auto/manual backup to a specific folder.
- **Multi-Format Export**: AI-ready CSV/JSON and human-readable PDF/Sheets.
- **Home Screen Widgets**: Perform sync and check status at a glance.
- **Background Sync (Experimental)**: Automated periodic data updates.

## Tech Stack

- **Framework**: React Native, Expo (SDK 54+)
- **Language**: TypeScript (Strict Mode)
- **State Management**: Zustand
- **Testing**: Vitest (Unit/Integration)
- **Error Monitoring**: Sentry
- **CI**: GitHub Actions

## Requirements

- Node.js 18+
- Android 9 (API 28)+
  - Recommended: Android 14+ (Built-in Health Connect)
- Google Cloud Console Project (with Google Drive API enabled)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root and set the following variables:

```env
# Web Client ID from Google Cloud Console (Required)
EXPO_PUBLIC_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# Expo / EAS Configuration (Required)
EXPO_PUBLIC_SLUG=your-slug
EXPO_PUBLIC_EAS_PROJECT_ID=your-project-id

# App Bundle Identifier / Package Name (Required)
EXPO_PUBLIC_BUNDLE_IDENTIFIER=your.bundle.identifier

# Sentry Error Monitoring (Optional)
# If not set, Sentry will be disabled
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Sentry Build-time Configuration (Only if using Sentry)
SENTRY_AUTH_TOKEN=your-sentry-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-name
```

### 3. Start Development Server

```bash
npx expo prebuild --platform android
npm run android
```

## Build Process

Local builds are supported via internal build scripts.
Ensure "Environment Variables" are configured as described above before running builds.

### Commands

```bash
# Complete Build (prebuild + gradle build)
npm run build:android:all

# Specific Build Modes
npm run build:android:debug   # Generate APK
npm run build:android:release # Generate AAB
```

### Expo / EAS Notes

When cloning and building in your own environment, please note the following:

1. **Project ID Update**: Update `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env` with your own project ID.
2. **Slug Change**: Change `EXPO_PUBLIC_SLUG` in `.env` to your own project name.
3. **Bundle ID Change**: Change `EXPO_PUBLIC_BUNDLE_IDENTIFIER` in `.env` to your own app bundle identifier / package name.

## Project Structure

```
├── app/                    # Expo Router pages
├── src/
│   ├── components/         # UI Components
│   ├── contexts/           # React Contexts (Language, Theme, etc.)
│   ├── hooks/              # Custom Hooks (Business UI Logic)
│   ├── services/           # Core Logic (Internal/External Services)
│   ├── stores/             # Zustand Stores (Global State)
│   ├── types/              # TypeScript Definitions
│   ├── theme/              # Theme & Color Definitions
│   ├── widgets/            # Android Native Widgets
│   └── i18n/               # Internationalization Data
├── __tests__/              # Unit/Integration tests with Vitest
└── scripts/                # Build and maintenance scripts
```

## Development Guidelines

- **Type Safety**: Robust error handling using the `Result<T, E>` type.
- **Testing**: Always add tests for critical service logic.
- **Lint/Format**: Use `npm run lint:fix` and `npm run format`.

## License

GNU General Public License v3.0 (GPL-3.0)
