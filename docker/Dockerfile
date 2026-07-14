FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install server dependencies (including prisma for generate + migrate)
COPY server/package*.json ./server/
RUN cd server && npm ci --production=false

# Generate Prisma client
COPY server/prisma ./server/prisma/
RUN cd server && npx prisma generate

# Build frontend
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Copy server source
COPY server/ ./server/

EXPOSE 3000

# Run migrations then start the server
CMD ["node", "server/index.js"]
