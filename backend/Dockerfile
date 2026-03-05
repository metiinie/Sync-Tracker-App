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

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Re-install drizzle-kit and its peer deps specifically for the migration tool
# OR just install everything if it's for local dev. 
# But let's keep it lean and just add what's missing for 'npx drizzle-kit push'
RUN npm install drizzle-kit@0.31.9

# Copy built app
COPY --from=builder /app/dist ./dist

# Copy everything else we might need for migrations
COPY entrypoint.sh ./
COPY drizzle.config.ts ./
# We also need any schema files that drizzle.config.ts points to. 
# For now, let's copy the whole src for schema analysis by drizzle-kit
COPY src ./src

RUN sed -i 's/\r$//' entrypoint.sh
RUN chmod +x entrypoint.sh

# Environment variables will be provided by Render
EXPOSE 3000

CMD ["sh", "entrypoint.sh"]

