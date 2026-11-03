# Node is pinned to an exact release, not a moving tag such as node:24-alpine.
# A moving tag is resolved once and then cached on the server, so security
# releases never arrived on their own. Dependabot (.github/dependabot.yml)
# proposes each new release as a pull request; CI builds and smoke-checks it,
# and the deploy smoke-checks it again and rolls back on failure.
# Alpine 3.23 matches the API image (30sec repo), so both move together.
FROM node:24.22.2-alpine3.23 AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENV NEXT_PUBLIC_API_URL=https://30sec.org/api
RUN npm run build

FROM node:24.22.2-alpine3.23 AS production
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
