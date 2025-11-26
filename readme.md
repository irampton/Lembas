
# Lembas
AI-powered, locally hosted recipe storage app.

## Description
Lembas helps you capture, clean up, and share recipes while keeping everything on your own machine. It has a simple web-based frontend that supports OCR & local LLMs for turning your messy recpies into structured ingredients and steps.

## Requirements
- Node.js 18+ and npm
- [llama.cpp](https://github.com/ggml-org/llama.cpp) server or similar for LLM features
- [Tesseract CLI](https://github.com/tesseract-ocr/tesseract) available on your PATH for OCR features

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

Or use `npm run build` to build separately, then  `node index.js` to run.

## Basic usage
- Open http://localhost:3000 after starting the server.
- Create or sign in to your account using the invite code on the terminal
- Add recipes manually or import them via text/OCR.
- Save changes to sync updates locally; create links to share your recipes publicly, or invite friends to share privately.

