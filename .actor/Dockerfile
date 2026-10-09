FROM apify/actor-node:18
COPY package*.json ./
RUN npm install --only=production
COPY . ./
CMD npm start
