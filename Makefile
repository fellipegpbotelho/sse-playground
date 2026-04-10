.DEFAULT_GOAL := help

# ── Dev server ────────────────────────────────────────────────────────────────

.PHONY: dev
dev:  ## Start the dev server with hot-reload
	uv run uvicorn main:app --reload

.PHONY: run
run:  ## Start the server (no hot-reload)
	uv run uvicorn main:app

# ── Dependencies ──────────────────────────────────────────────────────────────

.PHONY: install
install:  ## Install all dependencies (including dev)
	uv sync --all-groups

# ── Code quality ──────────────────────────────────────────────────────────────

.PHONY: lint
lint:  ## Check for lint errors
	uv run ruff check .

.PHONY: format
format:  ## Format code
	uv run ruff format .

.PHONY: fix
fix:  ## Auto-fix lint errors and format
	uv run ruff check . --fix
	uv run ruff format .

.PHONY: check
check:  ## Lint + format check (no writes — for CI)
	uv run ruff check .
	uv run ruff format . --check

# ── Docker ────────────────────────────────────────────────────────────────────

.PHONY: docker-build
docker-build:  ## Build the Docker image
	docker build -t sse-playground .

.PHONY: docker-run
docker-run:  ## Run the app in Docker on port 8000
	docker run --rm -p 8000:8000 sse-playground

# ── Cleanup ───────────────────────────────────────────────────────────────────

.PHONY: clean
clean:  ## Remove cache and build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .ruff_cache -exec rm -rf {} +

# ── Help ──────────────────────────────────────────────────────────────────────

.PHONY: help
help:  ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
