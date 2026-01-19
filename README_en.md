# Health Export For AI

Running on Android, built with React Native + Expo. Reads health data from Health Connect and exports it to Google Drive in flexible formats (Google Sheets, PDF, CSV, JSON) for analysis with AI tools like NotebookLM.

[日本語 (Japanese)](./README.md)

## Features

- **Versatile Export Formats**:
  - **Google Sheets**: Spreadsheet format optimized for analysis
  - **PDF**: Document format suitable for sharing and viewing
  - **CSV**: For integration with other data analysis tools
  - **JSON**: Structured data optimized for AI input
- **Health Connect Integration**: Reads 8 types of health data
  - Steps, Weight, Body Fat, Calories Burned, Basal Metabolic Rate (BMR), Sleep, Exercise, Nutrition
- **Data Display**: Simple dashboard to check the latest health data
- **Google Drive Export**: One-tap backup to the cloud

## Requirements

- Node.js 18 or higher
- Android 14 or higher (API 34+)
- Device (or emulator) with Health Connect app installed

## Setup

### 1. Prepare Project

```bash
# Install dependencies
npm install

# Prebuild for Android build
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
# Run tests
npm run test

# Run tests once
npm run test:run
```

## Project Structure

```
├── app/                    # Expo Router pages
├── src/
72: │   ├── components/         # UI components
73: │   ├── hooks/              # Custom hooks
74: │   ├── stores/             # Zustand stores
75: │   ├── services/           # Business logic (Export, Drive, Health)
76: │   ├── types/              # Type definitions
77: │   ├── utils/              # Utilities
78: │   └── config/             # Configuration
├── __tests__/              # Vitest tests
└── app.json                # Expo configuration
```

## License

GNU General Public License v3.0 (GPL-3.0)
