.PHONY: livekit-server dev build preview stop host help

# Default network binding (empty = local only)
NETWORK ?=
# Common variables
PID_FILE := .livekit_pid

# LiveKit bind flag based on NETWORK
ifeq ($(NETWORK),host)
  LIVEKIT_BIND := --bind 0.0.0.0
  SVELTE_HOST := --host
  MODE := LAN
else
  LIVEKIT_BIND :=
  SVELTE_HOST :=
  MODE := local
endif


### LiveKit server management
livekit-server:
	@echo "Starting LiveKit server ($(MODE))..."
	@if [ -f $(PID_FILE) ]; then echo "LiveKit already running (PID=$$(cat $(PID_FILE))). Stop it first."; exit 1; fi
	@nohup livekit-server --dev $(LIVEKIT_BIND) >/dev/null 2>&1 & echo $$! > $(PID_FILE)
	@sleep 1 && echo "LiveKit running in background (PID=$$(cat $(PID_FILE))). No logs attached."


stop:
	@if [ -f $(PID_FILE) ]; then \
		kill $$(cat $(PID_FILE)) && rm $(PID_FILE) && echo "LiveKit server stopped."; \
	else \
		echo "No running LiveKit server found."; \
	fi


### Development & preview workflows
dev: livekit-server
	@echo "Starting SvelteKit dev server ($(MODE))..."
	@npm run dev -- $(SVELTE_HOST) || (make stop; exit 1)

build:
	@echo "Building SvelteKit project..."
	@npm run build

preview: livekit-server build
	@echo "Starting SvelteKit preview server ($(MODE))..."
	@npm run preview -- $(SVELTE_HOST) || (make stop; exit 1)

host: NETWORK=host
host: preview


### Helper targets
help:
	@echo
	@echo "Available commands:"
	@echo "  make dev             Start LiveKit + SvelteKit dev (default: local)"
	@echo "  make dev NETWORK=host   Start both in LAN mode"
	@echo "  make preview         Build + run LiveKit + SvelteKit preview"
	@echo "  make preview NETWORK=host   Same, but on LAN"
	@echo "  make build           Build SvelteKit project only"
	@echo "  make stop            Stop running LiveKit server"
	@echo "  make host            Shortcut: preview in LAN mode"
	@echo
