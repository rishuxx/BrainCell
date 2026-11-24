# BrainCell assignment review

Reviewed on 24 November 2026 against all six pages of the Lyftr assignment PDF. I used `Mds/AGENTS.md` as the project's engineering checklist and confirmed it is byte-identical to the root `AGENTS.md`. The review covers the current working tree, including uncommitted changes, based on commit `d7c1725`. The requested scope was to run, test, and report. The application source was left as found.

**Submission status: incomplete.** The local backend produced real answers, reused a cached reply, recovered through a backup credential when the primary was forced to fail, and recalled earlier context. The highest-priority gaps are public deployment, New Chat isolation, automatic fallback for provider errors, and misleading success responses when SQLite writes fail.

## Verified failures and fixes

| Priority | Finding and evidence | Fix and acceptance check |
| --- | --- | --- |
| P0 | **Public deployment is unavailable at the documented addresses.** The README frontend URL and backend `/health` each returned HTTP 404. This checkout has no Git remote, and a public repository and narrated demo could not be verified. | Deploy backend with a persistent `/data` volume, two independent credentials, simulation enabled and the exact frontend CORS origin. Build frontend with the real backend URL. Configure SPA rewrites for chat deep links, update README with verified URLs, and check both anonymously before recording the 2–3 minute demo. |
| P0 | **New Chat retains previous context.** On a 390 px browser viewport, clicking New Chat changed the route but left the previous assistant reply visible and subsequent requests used the original API session ID. The displayed route ID also differed from the API ID immediately after guest entry. Reload did produce a fresh API ID, while the URL still showed its former ID. | Use a single session ID for routing, display and requests. Reset messages and pending state and discard old in-flight responses on New Chat. Verify A→B isolation, reload, and a delayed response in A after switching to B. See `frontend/src/App.tsx`, `pages/ChatPage.tsx`, and `hooks/useChat.ts`. |
| P0 | **Automatic failover misses part of the required 5xx range.** A structured HTTP 504 injected at the completion boundary returned 503 after one call, with a successful backup response available. The gateway scans exception text for selected strings and owns the fallback loop itself. LiteLLM serves completions and caching, but the live routing path does not use its fallback facilities as requested by the repo checklist and the PDF evaluation rubric. | Use LiteLLM routing with deterministic deployment order and classify failures by normalized exception type or structured status. Cover quota, 429 and all relevant 5xx with the second credential reached exactly once. Make simulation and real failures exercise the same decision path. See `backend/app/services/llm.py`. |
| P0 | **SQLite errors can lose a successful turn and failed requests can change the system prompt.** A forced SQLite write exception returned chat 200, then history 404. An all-key simulation with a system prompt returned the correct 503 and history 404, but its override had already been committed to the sessions table. | Save the effective system prompt and message pair in one transaction after validating a successful completion. Return a sanitized error if the commit fails. Test a failed override against an existing session as well as a new one. See `backend/app/routes/chat.py` and `database.py`. |
| P1 | **Health signals readiness on failures.** Unreachable DB and an empty key pool both returned HTTP 200 with `status: degraded`. The Docker healthcheck only checks HTTP success and hardcodes port 8000 even though the startup command accepts `PORT`. | Return 503 JSON when prerequisites fail and have the container check its actual port. Verify the transition from ready to unavailable without model calls. See `backend/app/routes/health.py` and `backend/Dockerfile`. |
| P1 | **Browser error and metadata contract is incomplete.** A standard FastAPI 422 validation array rendered as `[object Object]`. An HTTP 200 with an empty JSON object added another assistant container without metadata. The token test IDs contained `In: 11` and `Out: 3` instead of the integer text required by the PDF. A 503 did show a readable message. | Normalize string and FastAPI validation-list errors, validate the success payload at the API boundary, and render labels outside the test-ID spans. Assert the exact selector text for live and cached replies. See `frontend/src/services/api.ts` and `components/ResponseMetadata.tsx`. |
| P1 | **Configuration is misleading.** The gateway hardcodes OpenRouter Gemini 2.5 Flash despite `LLM_MODEL` in the README and examples. It truncates credentials at `-backup`. Three configured slots became two distinct outgoing credential values under this normalization. The successful `key_2` test establishes that the slot answered, while quota independence remains unverified. | Use the configured provider/model throughout. Pass credentials unchanged, reject duplicates, and verify two working credentials from independent quota pools where possible. Align README and `.env.example` with the actual provider. |
| P1 | **Optional system prompt appears functional but is unwired.** Setting it in the browser did not add `system_prompt` to subsequent request payloads. On mobile, the sidebar backdrop intercepted clicks on the settings close button. During a separate sidebar close attempt, the control moved outside the viewport. | Connect the prompt to the active chat or remove the optional input. Make the modal own its overlay and focus, support Escape, and retest touch interactions with the sidebar open. See `frontend/src/App.tsx`, `pages/ChatPage.tsx` and `components/Settings.tsx`. |
| P2 | **API edge cases.** `/openapi.json` returned 200 alongside the three specified endpoints. Chat trimmed a nonblank padded session ID before echoing it, and looking up the original ID returned 404. | Disable the OpenAPI route for the exact three-endpoint contract. Validate whitespace-only IDs without silently changing valid IDs, use one encoding policy across both routes, and add a round-trip test. |

## Acceptance evidence

| PDF requirement | Result |
| --- | --- |
| React + FastAPI + SQLite | Production frontend build succeeded from a clean temporary copy with `npm ci` and `npm run build`. The first install in the active workspace hit a Windows native-module file lock. Browser smoke testing used the built app in headless Edge with intercepted API replies for deterministic UI checks. |
| Validation, errors and history | All 34 existing backend tests passed both in the installed environment (10.96 s) and in a fresh Python 3.13 virtual environment using the exact versions in requirements.txt (8.53 s). Coverage includes bad requests, history ordering and isolation, simulated failover and fake cache metadata. Direct smoke requests verified the 503 body, unknown history 404, and local CORS preflight with the simulation header. |
| Live inference and per-request usage | With the existing local credentials, the first unique prompt returned 200, `LIVE_INFERENCE`, `key_1`, 49 input and 1 output token, and 1,939 ms server-measured latency. |
| Built-in cache | Identical first prompt in a different session returned 200, `LLM_CACHE`, identical reply and token counts, null key, zero failed keys and 1,108 ms. A later repeat reported 1 ms. This verifies response metadata and behavior in this run. Provider-call counting and invalid-entry handling were not independently instrumented. |
| Live simulation | With the same previously cached prompt, `key_1=429` returned a real response through `key_2`, `LIVE_INFERENCE`, one failed key, and 1,087 ms. Wildcard simulation returned the exact 503 and no message history. Existing tests cover 500, 502 and 503 with a mocked completion. |
| Server-side context and persistence | Two real turns returned 200 and the assistant recalled a name from the previous user turn. History showed user, assistant, user, assistant. A SQLite file retained successful history across two app lifespans. This was a local app restart check. |
| Exact browser selectors | Composer cleared and the send button was disabled while pending. The assistant container exposed all required metadata selectors, with token text and malformed-response gaps described above. Guest chat was reachable without login. |
| Docker | `docker compose config --quiet` passed. Both multi-stage Dockerfiles, the Makefile targets, the expected port mappings and the named `/data` volume are present. Docker Desktop's Linux engine was unavailable, GNU Make was missing from PATH, and existing processes occupied ports 3000 and 8000. Image builds, `make up` and volume retention across container recreation were not verified. |
| Live delivery | Both README endpoints returned 404. Public frontend-to-backend requests, deployed CORS, public backing storage, public repository access and the voice demo remain unverified. |

## Improvements after the blockers

- Replace canned cache hit tests with a stub at the provider transport boundary. Keep the real LiteLLM wrapper active, assert one upstream call for an exact repeat, and cover changed context, model, simulation bypass, and invalid responses. The current cache tests patch `litellm.acompletion` itself.
- Treat missing token usage, missing model, and blank replies as invalid provider responses. The current code substitutes zero tokens and falls back to the configured model name. Validate the result before admitting it to cache, and verify that an invalid result never becomes a later hit.
- Log safe key IDs, exception classes, and numeric statuses. Current code logs raw provider exception text and tracebacks, which can carry request or provider details. The local `.env` was ignored by Git. A full Git history credential scan was outside this run.
- Add a concurrency regression test for two overlapping turns in one session and one independent session. The in-process lock map retains every ID indefinitely. Keep a single worker for this design or explicitly guarantee ordering across workers.
- Keep the public chat easy to find. The homepage puts sign-in behind its primary action and guest chat in a secondary link. The Supabase integration is outside the core assignment and its frontend environment variables are missing from `.env.example`. If retained, document what it does and keep guest chat prominent.
- Update README verification examples to reflect the actual deployment and two-key assumptions. With the three slots used locally, `key_1=429,key_2=500` leaves a third slot available. Use `*=429` for a deterministic full outage.

## Reproduce

From PowerShell in the project root:

```powershell
Push-Location backend
python -m pip install -r requirements.txt
python -m pytest -q
Pop-Location

Push-Location frontend
npm.cmd ci
npm.cmd run build
Pop-Location

docker compose config --quiet
docker compose up --build -d
curl.exe -i http://localhost:8000/health
curl.exe -i http://localhost:3000/
```

Use a clean Python environment for the backend commands and run the Docker commands after the engine is ready and ports 3000 and 8000 are free. Repeat the same first prompt in two fresh sessions, then send `X-Simulate-Failure: key_1=429` and `X-Simulate-Failure: *=429`. Save a successful session ID, recreate the backend container without deleting the named volume, and verify its history. Repeat the public checks against the deployed URLs and confirm the frontend's request origin and target in the browser.
