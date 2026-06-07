# Debian Bookworm + OpenSSL 3 is the safest base for Prisma on Docker.
# This avoids the common Prisma/OpenSSL crash that makes login fail.
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 4000
CMD ["sh", "-c", "npm run dev"]
