FROM hydrooj/judger:latest
RUN apt-get update && \
    apt-get install -y gcc g++ fp-compiler && \
    mv /hydro/examples/langs.slim.yaml /config/langs.yaml && \
    rm -rf /var/lib/apt/lists/*
