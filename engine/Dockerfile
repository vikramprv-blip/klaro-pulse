FROM mcr.microsoft.com/playwright:v1.42.0-jammy
WORKDIR /app
COPY engine/package.json ./package.json
RUN npm install
RUN npx playwright install chromium
COPY engine/ ./
CMD ["node", "runner.js"]
