# VoiceRAG Frontend

React-based 5-page UI for the VoiceRAG AI lecture assistant.

> **Note:** This is the frontend only. The Flask backend (`python app.py` at project root) must also be running for chat, search, and analytics to work.

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Animated hero with particle canvas and waveform |
| `/chat` | Chat | Voice + text RAG chat with lecture sidebar |
| `/knowledge` | Knowledge Base | Browse all 30 lectures, preview transcript chunks |
| `/search` | Search Explorer | Semantic search with cosine score visualisation |
| `/analytics` | Analytics | Live dashboard with Recharts charts |

## Setup

```bash
npm install
npm start      # http://localhost:3000
```

## Environment

The frontend calls the backend at `http://localhost:5000` by default.
To change this, set `REACT_APP_API_URL` in a `.env.local` file:

```
REACT_APP_API_URL=http://your-server:5000
```

## Build

```bash
npm run build   # production bundle → build/
```
