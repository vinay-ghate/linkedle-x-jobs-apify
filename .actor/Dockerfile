FROM apify/actor-node:20
COPY package*.json ./
RUN npm install --only=production
COPY . ./
CMD npm start
