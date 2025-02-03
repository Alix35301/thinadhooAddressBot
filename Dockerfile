FROM node:alpine

WORKDIR /addressBot

COPY . .

RUN npm install

CMD ["nodejs", "bot.js"]    