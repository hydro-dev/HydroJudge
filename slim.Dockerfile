FROM golang:latest AS build 
WORKDIR /build
RUN git clone https://github.com/criyle/go-judge.git /build && \
    go mod download && \
    go build -o executorserver ./cmd/executorserver

FROM node:12-stretch-slim
COPY --from=build /build/executorserver /
COPY . /hydro
WORKDIR /hydro
RUN mkdir -p /root/.config/hydro && \
    apt-get update && \
    apt-get install -y unzip gcc g++ fp-compiler && \
    mv /hydro/examples/langs.slim.yaml /root/.config/hydro/langs.yaml && \
    yarn && \
    rm -rf /var/lib/apt/lists/*

CMD /executorserver --dir /tmp/hydro/judger & node judger/daemon.js

