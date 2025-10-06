# Islam Vault - Quran Audio Web App

A modern React + TypeScript + Vite web application for listening to the Quran, reading transliterations, and translations. Features a beautiful UI, dark mode, and seamless ayah-by-ayah audio playback.

## Features
- Browse all Surahs and Ayahs of the Quran
- Play ayah audio with auto-advance and Surah transitions
- View Arabic text, transliteration, and English translation
- Responsive design and dark mode toggle
- Fast performance with Vite

## Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm or yarn

### Installation
```bash
npm install
```

### Running the App
```bash
npm run dev
```
Visit [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Project Structure
```
src/
  components/
    QuranAudio.tsx   # Main Quran audio player UI
  services/
    api.ts           # API service for Quran data
  App.tsx            # App entry point
  main.tsx           # Vite/React bootstrap
```

## Technologies Used
- React
- TypeScript
- Vite
- Tailwind CSS

## Customization
- To change the Quran data source, update API endpoints in `src/services/api.ts`.
- UI styles are managed with Tailwind CSS in `App.css` and `index.css`.

## License
MIT

---

For questions or contributions, open an issue or pull request.
