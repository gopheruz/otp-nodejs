FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN if [ -f .env ]; then sed -i 's/SMTP_PASSWORD="\(.*\)"/SMTP_PASSWORD=\1/g' .env; fi && \
    if [ -f .env ]; then sed -i 's/SMTP_PASSWORD=\(.*\)\s/SMTP_PASSWORD=\1/g' .env; fi

EXPOSE 3000

CMD ["node", "index.js"]