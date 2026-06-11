FROM node:20-alpine

# Prisma's query engine needs OpenSSL at runtime on Alpine/musl.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build (generates Prisma client + compiles TypeScript).
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# On start, sync the schema to the SQLite file (on the mounted volume), then run.
CMD ["npm", "run", "start"]
