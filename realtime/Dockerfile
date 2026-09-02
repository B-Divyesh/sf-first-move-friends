FROM node:22-alpine
ARG SOURCE_COMMIT=development
WORKDIR /app
COPY realtime/package.json realtime/package-lock.json ./
RUN npm ci --omit=dev
COPY realtime/game.mjs realtime/server.mjs ./
ENV NODE_ENV=production DATA_DIR=/data PORT=8080 BUILD_ID=$SOURCE_COMMIT
EXPOSE 8080
CMD ["node", "server.mjs"]
