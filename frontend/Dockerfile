# ==============================================================================
# STAGE 1: COMPILATION & BUILD
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Run production compilation of HTML chunks, asset routes, and tailwind minifications
RUN npm run build

# ==============================================================================
# STAGE 2: RUNNER
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/src/styles ./src/styles

EXPOSE 3000

USER node

CMD ["npm", "start"]
