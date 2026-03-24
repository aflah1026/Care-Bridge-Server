FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app .

RUN npm prune --omit=dev

EXPOSE 5000

CMD ["node", "index.js"]