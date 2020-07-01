FROM hydrooj/judge:latest
RUN apt-get update && \
    apt-get install -y \
            gcc g++ rustc \
            python python3 \
            fp-compiler \
            openjdk-8-jdk-headless \
            php7.0-cli \
            haskell-platform \
            libjavascriptcoregtk-4.0-bin \
            golang ruby \
            mono-runtime mono-mcs && \
    rm -rf /var/lib/apt/lists/*
