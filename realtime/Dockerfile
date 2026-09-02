FROM node:22-alpine
ARG BUILD_ID=development
WORKDIR /app
COPY realtime/package.json realtime/package-lock.json ./
RUN npm ci --omit=dev
COPY realtime/game.mjs realtime/server.mjs ./
ENV NODE_ENV=production DATA_DIR=/data PORT=8080 TRUST_PROXY_HOPS=1 BUILD_ID=$BUILD_ID
EXPOSE 8080
CMD ["node", "server.mjs"]
