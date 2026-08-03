FROM node:22-alpine

WORKDIR /usr/src/app/backend

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /usr/src/app/logs && chown -R node:node /usr/src/app

ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000

USER node
CMD ["node", "server.js"]
