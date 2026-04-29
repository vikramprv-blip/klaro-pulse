FROM mcr.microsoft.com/playwright:v1.42.0-jammy
WORKDIR /app
COPY engine/package.json ./package.json
RUN npm install
RUN npx playwright install chromium
COPY engine/audits ./audits
COPY engine/poller.js ./runner.js
CMD ["node", "runner.js"]
