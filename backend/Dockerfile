FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY . .
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3333/api/health || exit 1
CMD ["npm", "start"]
