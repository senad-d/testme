FROM node:20-alpine
WORKDIR /app
COPY src ./src
COPY config.json ./
CMD ["node", "src/app.js"]
