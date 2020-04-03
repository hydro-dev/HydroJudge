FROM alpine
WORKDIR /app
COPY Judger_linux_amd64 /app/
RUN apk update && \
    apk add unzip curl wget && \
    mkdir /config /cache && \
    curl -sSL https://raw.githubusercontent.com/hydro-dev/HydroJudger/master/examples/langs.yaml >/config/langs.yaml

ENV CONFIG_FILE=/app/config.yaml LANGS_FILE=/app/langs.yaml CACHE_DIR=/cache FILES_DIR=/files
CMD /app/Judger_linux_amd64
