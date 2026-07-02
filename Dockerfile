# Multi-stage build pra imagem mínima.
# Sem diretiva '# syntax=': ela força o builder a baixar a imagem frontend
# do Docker Hub, o que falha em builders sandboxados (ex: inspeção do
# Glama) — e este Dockerfile não usa nenhum recurso que dependa dela.
# Stage 1: instala deps + build (precisa devDependencies pra tsup/typescript).
# Stage 2: runtime enxuto (só prod deps + dist).

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# MCP comunica via stdio (stdin/stdout). Sem porta HTTP, sem healthcheck
# tradicional. O cliente MCP que iniciar o container fala direto pelo
# canal padrão.
ENTRYPOINT ["node", "dist/index.js"]
