# VoiceRAG Frontend

A beautiful, modern React frontend for VoiceRAG - Voice-powered Retrieval Augmented Generation.

## Features

✨ **Modern UI**
- Glassmorphism design with backdrop blur effects
- Smooth animations and transitions
- Dark mode and light mode support
- Fully responsive (mobile, tablet, desktop)

🎤 **Voice Integration**
- Web Speech API integration for voice input
- Real-time speech recognition
- Visual feedback while listening
- Fallback to text input

💬 **Chat Interface**
- Beautiful message bubbles with timestamps
- Auto-scrolling to latest messages
- User and bot message differentiation
- Message history

🎨 **Design Elements**
- Gradient backgrounds and buttons
- Custom styled scrollbars
- Glassmorphism effects
- Responsive layout

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Running the Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.js          # Main component
│   ├── App.css         # Main styles
│   ├── index.js        # Entry point
│   └── index.css       # Global styles
├── package.json
└── README.md
```

## Customization

### Colors
Edit the gradients and colors in `src/App.css`:
- Primary gradient: `#00ffc8` to `#4a90ff`
- Secondary colors can be modified in dark-mode and light-mode classes

### Connecting to Backend
In `App.js`, replace the simulated bot response in `handleSendMessage()` with actual API calls:

```javascript
const response = await fetch('/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: inputText })
});
const data = await response.json();
```

## Browser Support

- Chrome/Edge: Full support (Web Speech API)
- Firefox: Full support (Web Speech API)
- Safari: Supported (webkit prefix)
- Mobile browsers: Supported (iOS Safari, Chrome Mobile)

## Dependencies

- **React 18**: UI framework
- **React Icons**: Icon library (FaMicrophone, FaStop, etc.)
- **react-scripts**: CRA build tools

## License

MIT
