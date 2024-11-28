# ---- deps ----
FROM groupclaes/npm:10 AS depedencies
WORKDIR /usr/src/app

COPY package.json ./package.json
COPY .npmrc ./.npmrc

RUN npm install --omit=dev --ignore-scripts

# ---- build ----
FROM depedencies AS build
COPY index.ts ./index.ts
COPY src/ ./src

RUN npm install --ignore-scripts && npm run build

# ---- final ----
FROM groupclaes/node:20

USER node
WORKDIR /usr/src/app

# removed --chown=node:node
COPY --from=depedencies /usr/src/app ./
COPY --from=build /usr/src/app/index.min.js ./

CMD ["node","index.min.js"]