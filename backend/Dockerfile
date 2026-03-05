# 1) Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build app
RUN npm run build

# 2) Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN npm install --only=production

# Copy built app
COPY --from=builder /app/dist ./dist

# Copy everything else we might need for migrations (like entrypoint.sh, drizzle configs/schemas if any)
# We copy entrypoint.sh explicitly
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Environment variables will be provided by Render
EXPOSE 3000

CMD ["sh", "entrypoint.sh"]
