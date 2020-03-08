FROM golang:latest AS build 
WORKDIR /build
RUN git clone https://github.com/criyle/go-judge.git /build && \
    go mod download && \
    go build -o executorserver ./cmd/executorserver

FROM node:12-stretch-slim
COPY --from=build /build/executorserver /
COPY . /jd5
WORKDIR /jd5
RUN mkdir -p /root/.config/jd5 && \
    apt-get update && apt-get install -y unzip && \
    yarn

CMD /executorserver & node jd5/daemon.js
