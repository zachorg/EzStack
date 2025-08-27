## Multi-stage build for EzStack (Node 20 slim)
## Stage 1: Build TypeScript to dist/
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install build dependencies first (better cache)
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build to dist/
RUN npm run build

## Stage 2: Runtime image
FROM node:20-slim AS runtime

WORKDIR /app

# Create non-root user
RUN useradd --user-group --create-home --shell /bin/bash nodeuser

# Copy only necessary files
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-fund --no-audit

COPY --from=builder /app/dist ./dist

# Environment
ENV NODE_ENV=production

# Expose app port
EXPOSE 8080

# Switch to non-root
USER nodeuser

# Start command
CMD ["node", "dist/index.js"]


