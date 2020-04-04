FROM debian:stretch
WORKDIR /app
COPY Judger_linux_amd64 /app/
RUN apt-get update && \
    apt-get install -y unzip curl wget && \
    mkdir /config /cache && \
    chmod +x /app/hydrojudger-linux && \
    curl -sSL https://raw.githubusercontent.com/hydro-dev/HydroJudger/master/examples/langs.yaml >/config/langs.yaml
VOLUME [ "/config", "/cache"]
ENV CONFIG_FILE=/config/config.yaml LANGS_FILE=/config/langs.yaml CACHE_DIR=/cache FILES_DIR=/files
CMD "/app/hydrojudger-linux"
