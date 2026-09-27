# Development only: in production the server image builds and serves the bundle.
FROM node:24-alpine
WORKDIR /app/client
RUN chown -R node:node /app
USER node
COPY --chown=node:node client/package.json client/package-lock.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev"]
