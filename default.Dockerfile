FROM golang:latest AS build 
WORKDIR /build
RUN git clone https://github.com/criyle/go-judge.git /build && \
    go mod download && \
    go build -o executorserver ./cmd/executorserver

FROM node:12-stretch-slim
RUN apt-get update && \
    apt-get install -y \
            gcc g++ rustc unzip \
            python python3 \
            fp-compiler \
            openjdk-8-jdk-headless \
            php7.0-cli \
            haskell-platform \
            libjavascriptcoregtk-4.0-bin \
            golang ruby \
            mono-runtime mono-mcs

COPY --from=build /build/executorserver /
COPY . /hydro
WORKDIR /hydro
RUN mkdir -p /root/.config/hydro && \
    yarn

CMD /executorserver --dir /tmp/hydro/judger & node judger/daemon.js
