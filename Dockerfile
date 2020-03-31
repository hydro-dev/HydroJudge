FROM golang:latest AS executorserver
WORKDIR /build
RUN git clone -b judger https://github.com/hydro-dev/hydro-files.git /files && \
    git clone https://github.com/criyle/go-judge.git /build && \
    go mod download && \
    go build -o /files/executorserver ./cmd/executorserver

FROM node:13-stretch-slim
WORKDIR /app
COPY judger.js /app/
RUN apt-get update && \
    apt-get install -y unzip curl wget && \
    mkdir /config /cache && \
    curl -sSL https://raw.githubusercontent.com/hydro-dev/HydroJudger/master/examples/langs.yaml >/config/langs.yaml

ENV CONFIG_FILE=/app/config.yaml LANGS_FILE=/app/langs.yaml CACHE_DIR=/cache FILES_DIR=/files
CMD /files/executorserver --dir /tmp/hydro/judger --silent & \
    node /app/judger.js
