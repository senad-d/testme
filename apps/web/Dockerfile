# syntax=docker/dockerfile:1
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS dependencies
WORKDIR /workspace
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY patches/ ./patches/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html ./apps/web/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/content/package.json ./packages/content/
COPY tests/e2e/package.json ./tests/e2e/
RUN pnpm install --frozen-lockfile
COPY packages/shared/src/ ./packages/shared/src/
COPY apps/web/src/ ./apps/web/src/
RUN pnpm --filter @mobey/shared build

FROM dependencies AS development
RUN chown -R node:node /workspace
USER node
EXPOSE 5173
CMD ["pnpm", "--filter", "@mobey/web", "exec", "vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

FROM dependencies AS build
RUN pnpm --filter @mobey/web build

# Static asset evidence only; AWS/CloudFront API routing belongs to later tasks.
FROM nginxinc/nginx-unprivileged:1.30.2-alpine@sha256:de3e40ec8b7debd7194fc798d4bbfb102c7f8b012b2c73032816b5f72393acdd AS production
# The upstream runtime still carries older libraries. Pin every security update;
# retain its unprivileged configuration and restore its runtime user below.
USER root
RUN apk add --no-cache \
    c-ares=1.34.8-r0 curl=8.22.0-r0 libcurl=8.22.0-r0 \
    libcrypto3=3.5.9-r0 libssl3=3.5.9-r0 libexpat=2.8.5-r0 \
    libpng=1.6.59-r0 libuuid=2.41.6-r1 pcre2=10.49-r0 \
    tiff=4.7.2-r0 zlib=1.3.2-r1
COPY --from=build /workspace/apps/web/dist/ /usr/share/nginx/html/
USER 101
EXPOSE 8080
HEALTHCHECK CMD ["wget", "--spider", "-q", "http://127.0.0.1:8080/"]
