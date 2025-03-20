# ---- deps ----
FROM groupclaes/esbuild:v0.25.0 AS deps
WORKDIR /usr/src/app

COPY package.json ./package.json
COPY .npmrc ./.npmrc

RUN npm install --omit=dev --ignore-scripts


# ---- build ----
FROM deps AS build
COPY index.ts ./index.ts
COPY src/ ./src

RUN npm install --ignore-scripts && npm run build


# ---- final ----
FROM groupclaes/node:22

# set current user to node
USER node
WORKDIR /usr/src/app

# copy dependencies and assets
COPY --from=deps /usr/src/app ./
COPY --from=build /usr/src/app/index.min.js ./

CMD ["node","index.min.js"]