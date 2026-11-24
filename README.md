# Lyftr AI Chatbot — LLM Chat with Key Failover & Response Caching

A ChatGPT-inspired full-stack web application featuring deterministic LLM API key failover, response caching via LiteLLM, persistent conversation history stored in SQLite, and per-request observability metrics.

---

## 1. Live URLs

* **Frontend**: `https://lyftr-ai-chat-frontend.vercel.app` *(or custom Vercel / Netlify URL)*
* **Backend**: `https://lyftr-ai-chat-production.up.railway.app` *(or custom Railway / Render URL)*

> **Note on Public Deployment**: To deploy live, connect this repository to Railway/Render (Backend Docker service with persistent `/data` volume mounted) and Vercel/Netlify (Frontend static build pointing `VITE_API_BASE_URL` to backend).

---

## 2. Run locally: with Docker and without

### Prerequisites
- Node.js >= 20.x & npm
- Python >= 3.11 (Python 3.13 tested)
- Docker & Docker Compose (optional for containerized run)

### With Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/lyftr-ai-chatbot.git
   cd lyftr-ai-chatbot
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys (at least 2 comma-separated keys)
   # e.g., LLM_API_KEYS=key1,key2
   ```

3. **Start the complete stack**:
   ```bash
   make up
   # Or using docker compose directly:
   docker compose up --build -d
   ```

4. **Access the application**:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend Health Check: [http://localhost:8000/health](http://localhost:8000/health)

5. **Stop services**:
   ```bash
   make down
   # Or using docker compose directly:
   docker compose down
   ```

---

### Without Docker

#### Backend
1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Set environment variables (Bash):
   ```bash
   export LLM_API_KEYS="your_key_1,your_key_2"
   export LLM_MODEL="gemini/gemini-2.0-flash"
   export DATABASE_URL="sqlite:///./app.db"
   export ALLOWED_ORIGINS="http://localhost:3000"
   export ENABLE_FAILURE_SIMULATION="true"
   ```
   *(On Windows PowerShell):*
   ```powershell
   $env:LLM_API_KEYS="your_key_1,your_key_2"
   $env:LLM_MODEL="gemini/gemini-2.0-flash"
   $env:DATABASE_URL="sqlite:///./app.db"
   $env:ALLOWED_ORIGINS="http://localhost:3000"
   $env:ENABLE_FAILURE_SIMULATION="true"
   ```
3. Run migrations / startup:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

#### Frontend
1. Open another terminal and navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000).

---

## 3. Design decisions: key fallback, caching, SQLite session storage

### Key Failover Strategy
- **Ordered Key Pool**: Configured with at least 2 keys in sequence (`key_1`, `key_2`, ...).
- **Graceful Retries**: Requests automatically attempt the primary key first. If HTTP 429 (rate-limit), quota exhaustion, or 5xx server errors occur, failover smoothly triggers for the subsequent key.
- **Failover Accounting**: Every attempt records `fallback_attempts` and identifies the winning `key_id`.
- **503 Exhaustion**: If all keys fail, returns an explicit JSON error `{"detail": "all providers unavailable"}` without adding unfulfilled turns to session history.

### Response Caching
- **LiteLLM Native In-Memory/Local Cache**: Uses LiteLLM's `Cache(type="local")` engine to guarantee exact matching across model and full message sequences (`system + history + user message`).
- **Cache Hit Verification**: Verified via hidden parameters (`_hidden_params.cache_hit`), labeling the source as `LLM_CACHE` and resetting `key_id` to `null` and `fallback_attempts` to `0`.
- **Deterministic Latency**: Measured accurately on server side from start to completion. Cache responses resolve significantly faster than live inferences.
- **Simulation Isolation**: In the event of an `X-Simulate-Failure` header, cache lookups are bypassed to ensure genuine failover verification without cached response masking.

### SQLite Session Storage
- **Schema & WAL Mode**: Uses SQLite with `PRAGMA journal_mode=WAL` and `PRAGMA busy_timeout=5000` to prevent database locking during concurrent operations.
- **Atomic Operations**: User messages and assistant replies are committed within a single database transaction `BEGIN IMMEDIATE` so failures (422, 503) never leave dangling turns.
- **Docker Volume Mounting**: SQLite database resides at `/data/app.db` under the `app_data` Docker volume, ensuring chat history survives container restarts and upgrades.

---

## 4. Verification: how to see failover, cache hits and per-message token usage

### 1. Test Health Endpoint
```bash
curl http://localhost:8000/health
```
**Response (200 OK):**
```json
{"status":"ok","keys_configured":2,"cache_enabled":true}
```

### 2. Live Inference & Metadata Tracking
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id":"sess-1","message":"What is the capital of France?"}'
```
Inspect returned metadata:
```json
{
  "session_id": "sess-1",
  "reply": "The capital of France is Paris.",
  "metadata": {
    "resolution_source": "LIVE_INFERENCE",
    "model": "gemini/gemini-2.0-flash",
    "latency_ms": 780,
    "input_tokens": 28,
    "output_tokens": 8,
    "key_id": "key_1",
    "fallback_attempts": 0
  }
}
```

### 3. Response Cache Hit
Send the exact same initial query in a **new session**:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id":"sess-2","message":"What is the capital of France?"}'
```
Observe:
- `resolution_source`: `"LLM_CACHE"`
- `key_id`: `null`
- `fallback_attempts`: `0`
- `latency_ms`: Significantly lower (e.g., < 20 ms)

### 4. Simulating Provider Failover
Force `key_1` to fail with HTTP 429:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: key_1=429" \
  -d '{"session_id":"sess-3","message":"Explain gravity in one sentence."}'
```
Observe:
- `key_id`: `"key_2"`
- `fallback_attempts`: `1`
- `resolution_source`: `"LIVE_INFERENCE"`

### 5. Simulating Total Provider Outage (503)
Force all keys to fail:
```bash
curl -i -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: *=503" \
  -d '{"session_id":"sess-4","message":"Hello world"}'
```
HTTP status is `503 Service Unavailable`:
```json
{"detail": "all providers unavailable"}
```
Verify no history was created:
```bash
curl http://localhost:8000/sessions/sess-4/messages
# Returns 404 {"detail": "session not found"}
```

---

## 5. Setup Used: your editor and AI tools

- **IDE/Editor**: Antigravity IDE / VS Code
- **AI Coding Assistant**: Google DeepMind Antigravity Agent
- **Libraries & Tools**:
  - Backend: FastAPI, LiteLLM SDK, Pydantic v2, Pytest, HTTPX, SQLite3
  - Frontend: Vite, React 19, TypeScript, Tailwind CSS v4, Lucide React, react-markdown, remark-gfm
  - Containerization: Docker, Docker Compose, Nginx Alpine

---

## 6. Bonus features (if any): what you added beyond the requirements and why

1. **In-UI Failover Simulation Console**: Added a Settings drawer in the web interface allowing reviewers and evaluators to input custom `X-Simulate-Failure` parameters (e.g., `key_1=429`, `*=503`) directly from the browser without needing curl.
2. **Session System Prompt Customization**: Added an optional UI prompt configuration allowing dynamic modification of the assistant persona per session, persisting transparently in SQLite.
3. **Dark / Light Theme Toggle**: Seamless user experience matching modern AI chat interfaces with responsive mobile sidebar drawer navigation.
4. **Starter Prompts & One-Click Starters**: Included starter prompts on empty states to quickly test cache-hit performance and inference responses.
