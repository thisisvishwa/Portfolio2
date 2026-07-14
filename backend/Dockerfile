# ==============================================================================
# STAGE 1: COMPILATION & BUILD
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency mappings
COPY package*.json ./
COPY ../prisma ../prisma

# Install all dependencies (including devDeps for compiling)
RUN npm ci

# Copy core codebase
COPY . .

# Generate Prisma Client specifically targeting current architectures
RUN npm run prisma:generate

# Compile strict TypeScript into CommonJS JS bundle
RUN npm run build

# ==============================================================================
# STAGE 2: PRODUCTION RUNNER CONTAINER
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy built outputs and runtime dependency scopes
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

# Expose microservice access port
EXPOSE 5000

# Safe user context execution
USER node

CMD ["node", "dist/index.js"]
