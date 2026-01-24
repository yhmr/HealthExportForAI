# Health Export For AI

[日本語 (Japanese)](./README.md)

Running on Android, built with React Native + Expo. Reads health data from Health Connect and exports it to Google Drive in flexible formats (Google Sheets, PDF, CSV, JSON) for analysis with AI tools like NotebookLM.

## Tech Stack

- **Framework**: React Native, Expo (SDK 52+)
- **Language**: TypeScript
- **State Management**: Zustand
- **Testing**: Vitest
- **Error Monitoring**: Sentry
- **CI**: GitHub Actions

## Requirements

- Node.js 18 or higher
- Android 9 (API 28) or higher
  - Recommended: Android 14 (API 34) or higher (Health Connect is built-in)
- Health Connect app (for Android 13 and below)

## Setup

### 1. Prepare Project

```bash
# Install dependencies
npm install

# Prebuild for Android build (Required for Native Modules)
npx expo prebuild --platform android
```

### 2. Configure Environment Variables

Create a `.env` file in the project root and set the **Web Client ID** obtained from Google Cloud Console.

```env
EXPO_PUBLIC_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

### 3. Start Application

```bash
# Start development server
npm run android
```

## Google Drive API Configuration

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Drive API
3. Create OAuth 2.0 Client ID (Web application)
4. Set the obtained Client ID in `.env`

## Development Commands

```bash
# Run tests (Vitest)
npm run test

# Run tests once
npm run test:run

# Run Linter (ESLint)
npm run lint

# Run Formatter (Prettier)
npm run format
```

## Project Structure

```
├── app/                    # Expo Router pages
├── src/
│   ├── components/         # UI components
│   ├── hooks/              # Custom hooks (useOfflineSync, useDriveAuth, etc.)
│   ├── stores/             # Zustand stores (Settings, Sync)
│   ├── services/           # Business logic (HealthConnect, Drive, Export, BackgroundSync)
│   ├── i18n/               # Internationalization
│   ├── types/              # Type definitions
│   ├── utils/              # Utilities
│   └── config/             # Configuration
├── __tests__/              # Vitest tests
└── app.json                # Expo configuration
```

## License

GNU General Public License v3.0 (GPL-3.0)
