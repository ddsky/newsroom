# World Newsroom

A desktop client for the World News API that provides a comprehensive interface for searching, filtering, and managing news articles.

## Features

- **Search & Filter News**: Advanced search with filters for language, country, category, date range, and more
- **Top News**: View top news by country and language  
- **Front Pages**: Browse newspaper front pages from around the world
- **Save News**: Organize articles into custom folders
- **Saved Searches**: Save and reuse search queries
- **Offline Storage**: All settings and saved content stored locally

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

## Building

To build the application for distribution:

```bash
npm run build
```

This will create installers for your platform in the `dist` folder.

### One-command builds on Windows (Win + Linux)

From a Windows machine, you can build both Windows and Linux artifacts in one go:

```powershell
npm run dist:all
```

Results:
- Windows: `.exe` (NSIS installer)
- Linux: `.AppImage`

macOS `.dmg` must be built on macOS:

```bash
npm run dist:mac
```

If you need code signing/notarization, see the electron-builder docs.

## Configuration

When you first open the app, you'll be prompted to enter your World News API key. You can get a free API key from [worldnewsapi.com](https://worldnewsapi.com).

### API Key Setup

1. Go to [worldnewsapi.com](https://worldnewsapi.com)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Enter the API key in the Settings dialog when prompted

## Usage

### Search News
- Enter keywords in the search box
- Use filters to narrow down results by language, country, category, or date
- Save searches for later use
- Save interesting articles to folders

### Top News
- Select a country and language
- Click "Load Top News" to see the latest headlines

### Front Pages
- Choose a country and date
- View newspaper front pages from that region

### Folders
- Create custom folders to organize saved articles
- Articles can be saved to folders from any news view
- Browse and manage your saved content

## Development

The app is built with:
- **Electron** - Desktop app framework
- **Vanilla JavaScript** - No additional frontend frameworks
- **CSS Grid/Flexbox** - Modern responsive layout
- **Font Awesome** - Icons

### Project Structure

```
newsroom/
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Security bridge between main and renderer
│   ├── index.html       # Main application UI
│   ├── styles.css       # Application styles
│   └── app.js           # Main application logic
├── assets/              # Icons and images
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

### API Integration

The app uses the World News API with the following endpoints:

`/retrieve-front-page` - Get newspaper front pages

All API requests require a valid API key from worldnewsapi.com.

## License

MIT License - see LICENSE file for details

## Support

For issues with the World News API, visit [worldnewsapi.com/docs](https://worldnewsapi.com/docs)

For app-specific issues, please check the repository issues or create a new one.
