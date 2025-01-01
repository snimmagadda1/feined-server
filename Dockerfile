# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
RUN bun test
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules ./node_modules

COPY --from=prerelease /usr/src/app/*.ts ./
COPY --from=prerelease /usr/src/app/src/config/*.ts ./src/config/
COPY --from=prerelease /usr/src/app/src/middleware/*.ts ./src/middleware/
COPY --from=prerelease /usr/src/app/src/routes/*.ts ./src/routes/
COPY --from=prerelease /usr/src/app/src/utils/*.ts ./src/utils/
COPY --from=prerelease /usr/src/app/src/rxdb-server/*.ts ./src/rxdb-server/
COPY --from=prerelease /usr/src/app/src/*.ts ./src/
COPY --from=prerelease /usr/src/app/storage-memory-file-synced/*.ts ./storage-memory-file-synced/
COPY --from=prerelease /usr/src/app/package.json ./

# run the app
ENV NODE_ENV=production
USER bun
EXPOSE 8080
ENTRYPOINT [ "bun", "run", "src/index.ts" ]

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD curl -f http://localhost:8080/events/0/query || exit 1