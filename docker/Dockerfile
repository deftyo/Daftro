FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Install server dependencies (including prisma for generate + migrate)
COPY server/package*.json ./server/
RUN cd server && npm ci --production=false

# Generate Prisma client
COPY server/prisma ./server/prisma/
RUN cd server && npx prisma generate

# Prune dev dependencies after generate
RUN cd server && npm prune --production

# Build frontend
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Copy server source
COPY server/ ./server/

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node index.js"]
