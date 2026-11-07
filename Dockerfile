# Multi-stage Dockerfile for PushkarPath (Ultra-fast, zero-fail cloud deployment)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and client package definitions
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN npm --prefix client install

# Copy source files
COPY client/ ./client/
COPY server/ ./server/

# Build production frontend bundle
RUN npm --prefix client run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DEMO_MODE=true

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy server code and prebuilt frontend dist
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/client/public ./client/public

EXPOSE 5000

CMD ["node", "server/index.js"]

