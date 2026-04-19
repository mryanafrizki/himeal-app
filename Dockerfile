FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Copy standalone output
RUN cp -r .next/standalone/. ./standalone/ && \
    cp -r .next/static ./standalone/.next/static && \
    cp -r public ./standalone/public && \
    mkdir -p ./standalone/data && \
    chown -R nextjs:nodejs ./standalone

USER nextjs

WORKDIR /app/standalone

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DB_DIR=/app/standalone/data

CMD ["node", "server.js"]
