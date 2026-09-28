ENV_FILE = .env
CERT_DIR = certs
DEV      = docker compose --env-file $(ENV_FILE) -f srcs/compose.yaml
PROD     = docker compose --env-file $(ENV_FILE) -f srcs/compose.prod.yaml

all: dev

# Mountpoints of the node_modules volumes: created by Docker they would belong to root.
dev: check-env certs
	mkdir -p srcs/server/node_modules srcs/client/node_modules
	$(DEV) down --volumes
	$(DEV) up --build

prod: check-env certs
	$(PROD) up --build --detach
	@echo "Red Tetris: $$($(PROD) port app 3000 | sed -E 's|.*:|https://localhost:|')/"

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

# PORT is checked by compose (${PORT:?}).
check-env:
	@test -f $(ENV_FILE) || { echo "$(ENV_FILE) not found: cp .env.example $(ENV_FILE) and set PORT" >&2; exit 1; }

certs: $(CERT_DIR)/cert.pem

re: down clean dev

# Self-signed localhost certificate; the key stays readable by the containers' node user.
$(CERT_DIR)/cert.pem:
	mkdir -p $(CERT_DIR)
	openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=localhost" \
		-addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1" \
		-keyout $(CERT_DIR)/key.pem -out $@
	chmod 644 $(CERT_DIR)/key.pem

.PHONY: all dev prod down logs install typecheck test clean check-env certs re
