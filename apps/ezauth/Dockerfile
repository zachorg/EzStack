FROM node:20-slim AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --no-fund --no-audit

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app

RUN useradd --user-group --create-home --shell /bin/bash nodeuser

COPY package.json ./
RUN npm install --omit=dev --no-fund --no-audit
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=development
EXPOSE 8080
USER nodeuser
CMD ["node", "dist/index.js"]


