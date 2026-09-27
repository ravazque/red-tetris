ENV_FILE = .env
CERT_DIR = certs
DEV      = docker compose --env-file $(ENV_FILE) -f srcs/compose.yaml
PROD     = docker compose --env-file $(ENV_FILE) -f srcs/compose.prod.yaml

all: dev

dev: check-env certs
	$(DEV) down --volumes
	$(DEV) up --build

prod: check-env certs
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

certs: $(CERT_DIR)/cert.pem

# Self-signed localhost certificate, generated once. The key is made readable by
# the containers' node user whatever the host uid is.
$(CERT_DIR)/cert.pem:
	mkdir -p $(CERT_DIR)
	openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=localhost" \
		-addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1" \
		-keyout $(CERT_DIR)/key.pem -out $@
	chmod 644 $(CERT_DIR)/key.pem

.PHONY: all dev prod down logs install typecheck test clean check-env certs
