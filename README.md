# CardGame

A browser-based card game (frontend + simple backend).

Files included:
- `card-game.html`: Main page (single-file static version).
- `card-game-modular.html`: Modular page (can be used as SPA entry).
- `card-game.js`: Frontend interaction script.
- `card-game.css`: Styles.
- `server.py`: Optional backend for local runs (Flask/simple HTTP).
- `Dockerfile`: Optional container build.

Quick start (static):
1. Open `card-game.html` in your browser.
   - Note: AI summary requires the backend due to HTTPS/API restrictions.

Quick start (Python server):
```bash
cd CardGame
python3 server.py
# Then open http://localhost:8080 (or the port in server.py)
```

Docker (optional):
```bash
cd CardGame
docker build -t cardgame .
docker run -p 8080:8080 cardgame
```

License: MIT
