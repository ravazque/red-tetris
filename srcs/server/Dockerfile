FROM node:24-alpine AS base
WORKDIR /app/server
RUN chown -R node:node /app
USER node
COPY --chown=node:node server/package.json server/package-lock.json ./

# Source is bind-mounted by compose.yaml; only dependencies live in the image.
FROM base AS dev
RUN npm ci
EXPOSE 3000
CMD ["npm", "run", "dev"]

# The production image also serves the client bundle.
FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
COPY shared/ /app/shared/
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server/src src
COPY --chown=node:node shared /app/shared
COPY --from=client-build /app/client/dist /app/client/dist
EXPOSE 3000
CMD ["node", "src/index.ts"]
