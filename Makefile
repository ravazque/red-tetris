ENV_FILE = .env
DEV      = docker compose --env-file $(ENV_FILE) -f srcs/compose.yaml
PROD     = docker compose --env-file $(ENV_FILE) -f srcs/compose.prod.yaml

all: dev

dev: check-env
	$(DEV) down --volumes
	$(DEV) up --build

prod: check-env
	$(PROD) up --build --detach

down: check-env
	$(DEV) down --volumes
	$(PROD) down --volumes

logs: check-env
	$(PROD) logs --follow

install:
	npm --prefix srcs/server install
	npm --prefix srcs/client install

typecheck:
	npm --prefix srcs/server run typecheck
	npm --prefix srcs/client run typecheck

test:
	npm --prefix srcs/server test
	npm --prefix srcs/client test

clean: check-env
	$(DEV) down --volumes --rmi local
	$(PROD) down --volumes --rmi local

# PORT itself is validated by compose (${PORT:?...}), using its own .env parser.
check-env:
	@test -f $(ENV_FILE) || { echo "$(ENV_FILE) not found: cp .env.example $(ENV_FILE) and set PORT" >&2; exit 1; }

.PHONY: all dev prod down logs install typecheck test clean check-env
