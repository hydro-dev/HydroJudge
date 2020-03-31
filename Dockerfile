FROM golang:latest AS build 
WORKDIR /build
RUN git clone https://github.com/criyle/go-judge.git /build && \
    go mod download && \
    go build -o executorserver ./cmd/executorserver

FROM node:12-stretch-slim
COPY --from=build /build/executorserver /third_party/executorserver
COPY . /hydro
WORKDIR /hydro
RUN apt-get update && \
    apt-get install -y unzip && \
    yarn && \
    git clone -b judger https://github.com/hydro-dev/hydro-files.git /files
ENV CONFIG_FILE=/config/config.yaml LANGS_FILE=/config/langs.yaml CACHE_DIR=/cache FILES_DIR=/files
CMD /third_party/executorserver --dir /tmp/hydro/judger -silent & \
    node hydro/daemon.js
