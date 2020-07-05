FROM mhart/alpine-node:slim-10
WORKDIR /app
COPY judge.js ExecutorServer /app/
RUN apk update && \
    apk add unzip curl wget libc6-compat && \
    mkdir /config /cache && \
    chmod +x executorserver && \
    curl -sSL https://raw.githubusercontent.com/hydro-dev/HydroJudge/master/examples/langs.yaml >/config/langs.yaml && \
    rm -rf /var/cache/apk/*
VOLUME [ "/config", "/cache" ]
ENV CONFIG_FILE=/config/config.yaml LANGS_FILE=/config/langs.yaml CACHE_DIR=/cache FILES_DIR=/files
ENV START_EXECUTOR_SERVER=/app/executorserver EXECUTOR_SERVER_ARGS="--silent"
CMD ["node", "judge.js"]
