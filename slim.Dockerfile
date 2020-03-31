FROM hydrooj/judger:latest
RUN apt-get update && \
    apt-get install -y gcc g++ fp-compiler && \
    curl -sSL https://raw.githubusercontent.com/hydro-dev/HydroJudger/master/examples/langs.slim.yaml >/config/langs.yaml && \
    rm -rf /var/lib/apt/lists/*
