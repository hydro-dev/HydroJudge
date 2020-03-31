FROM golang:latest AS build 
WORKDIR /build
RUN git clone -b judger https://github.com/hydro-dev/hydro-files.git /files && \
    git clone https://github.com/criyle/go-judge.git /build && \
    go mod download && \
    go build -o /files/executorserver ./cmd/executorserver

FROM node:13-stretch-slim
COPY --from=build /files /files
COPY . /hydro
WORKDIR /hydro
RUN apt-get update && \
    apt-get install -y unzip curl wget && \
    mkdir /config && \
    curl -sSL https://raw.githubusercontent.com/hydro-dev/HydroJudger/master/examples/langs.yaml >/config/langs.yaml && \
    yarn 

ENV CONFIG_FILE=/config/config.yaml LANGS_FILE=/config/langs.yaml CACHE_DIR=/cache FILES_DIR=/files
CMD /files/executorserver --dir /tmp/hydro/judger --silent & \
    node judger/daemon.js
