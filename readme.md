
# Recipeas
AI-powered, locally hosted recipe storage app.

## Description
Recipeas helps you capture, clean up, and share recipes while keeping everything on your own machine. It has a simple web-based frontend that supports vision-capable LLMs for turning recipe text and images into structured ingredients and steps.

## Requirements
- Node.js 18+ and npm
- [llama.cpp](https://github.com/ggml-org/llama.cpp) server or similar for LLM features

## Installation
1) Install dependencies:
```
npm install
```
2) (Optional) Set `PORT` or `LLM_ENDPOINT` in your environment if you need non-default values.

## Running
Production-style serve (builds client assets then starts the API + static server on port 3000 by default):
```
npm start
```

Development serve (starts the Node API server at the first available port beginning with 3001 and runs Vite alongside it, with API and Socket.IO requests proxied through Vite):
```
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). Vue edits update live; press `Ctrl+C` to stop both servers. If backend port 3001 is occupied, the launcher automatically tries 3002, 3003, and so on. Set `BACKEND_PORT` to start scanning from a different port. Use `npm run dev:client` or `npm run dev:server` to run either process alone.

Or use `npm run build` to build separately, then  `node index.js` to run.

## Basic usage
- Open http://localhost:3000 after starting the server.
- Create or sign in to your account using the invite code on the terminal
- Add recipes manually or import them via text or image.
- Save changes to sync updates locally; create links to share your recipes publicly, or invite friends to share privately.

