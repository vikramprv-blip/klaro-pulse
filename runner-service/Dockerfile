FROM mcr.microsoft.com/playwright:v1.42.0-jammy
WORKDIR /app
COPY package.json ./
RUN npm install
RUN npx playwright install chromium
COPY poller.js ./
CMD ["node", "poller.js"]
