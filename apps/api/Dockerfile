# syntax=docker/dockerfile:1
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS dependencies
WORKDIR /workspace
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY patches/ ./patches/
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/content/package.json ./packages/content/
COPY tests/e2e/package.json ./tests/e2e/
RUN pnpm install --frozen-lockfile
COPY apps/api/src/ ./apps/api/src/
# The current-main API build compiles its shared workspace dependency first.
COPY packages/shared/src/ ./packages/shared/src/

FROM dependencies AS development
RUN chown -R node:node /workspace
USER node
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @mobey/api build && exec node apps/api/dist/main.js"]

FROM dependencies AS build
# `pm` selects pnpm's packaging command, not the root deployment task script.
RUN pnpm --filter @mobey/api build \
    && pnpm pm --filter @mobey/api --config.frozen-lockfile=true deploy --prod --legacy /runtime

# Keep build/development on the existing toolchain; production needs only Node.
FROM node:24.20.0-alpine3.24@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS production
# Exact security patches fail closed if unavailable; never use an unpinned upgrade.
# Remove unused package managers, not their metadata alone, from the runtime.
RUN apk add --no-cache libcrypto3=3.5.9-r0 libssl3=3.5.9-r0 zlib=1.3.2-r1 \
    && rm -rf /usr/local/lib/node_modules /opt/yarn-* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
        /usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /app
ENV NODE_ENV=production API_HOST=0.0.0.0
COPY --from=build --chown=node:node /runtime/package.json ./package.json
COPY --from=build --chown=node:node /runtime/node_modules/ ./node_modules/
COPY --from=build --chown=node:node /workspace/apps/api/dist/ ./dist/
# The existing runner resolves checked SQL relative to dist/database/migrate.js.
COPY --from=build --chown=node:node /workspace/apps/api/src/database/migrations/ ./src/database/migrations/
USER node
EXPOSE 3000
HEALTHCHECK CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health/live').then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "dist/main.js"]
