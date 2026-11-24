.PHONY: up down restart logs test backend-test frontend-dev backend-dev

# Start complete stack (frontend on :3000, backend on :8000)
up:
	docker compose up --build -d

# Stop services without deleting volume
down:
	docker compose down

# Restart services
restart: down up

# View logs
logs:
	docker compose logs -f

# Run backend tests
test:
	cd backend && python -m pytest tests/ -v

# Local backend dev (no Docker)
backend-dev:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Local frontend dev (no Docker)
frontend-dev:
	cd frontend && npm run dev
