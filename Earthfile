FROM node:lts-bullseye
WORKDIR /srv

deps:
  COPY ./ .
  RUN npm install

build:
  FROM +deps
  RUN npm run dist
  SAVE ARTIFACT publish AS LOCAL publish
