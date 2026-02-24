FROM node:18-alpine AS base
WORKDIR /app

# Minimal utilities for healthchecks and waits
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --production

# Copy source
COPY . .

ENV NODE_ENV=production \
    APP_ENV=production

EXPOSE 8000

CMD ["npm", "run", "start:prod"]
