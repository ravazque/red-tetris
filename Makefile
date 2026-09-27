ENV_FILE = --env-file .env
DEV      = docker compose $(ENV_FILE) -f srcs/compose.yaml
PROD     = docker compose $(ENV_FILE) -f srcs/compose.prod.yaml

all: dev

dev:
	$(DEV) down --volumes
	$(DEV) up --build

prod:
	$(PROD) up --build --detach

down:
	$(DEV) down --volumes
	$(PROD) down --volumes

logs:
	$(PROD) logs --follow

install:
	npm --prefix srcs/server install
	npm --prefix srcs/client install

typecheck:
	npm --prefix srcs/server run typecheck
	npm --prefix srcs/client run typecheck

clean:
	$(DEV) down --volumes --rmi local
	$(PROD) down --volumes --rmi local

.PHONY: all dev prod down logs install typecheck clean
