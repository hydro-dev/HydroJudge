FROM hydrooj/judger:latest
RUN mkdir -p /usr/share/man/man1 && \
    apt-get update && \
    apt-get install -y \
            gcc g++ rustc \
            python python3 \
            fp-compiler \
            openjdk-8-jdk-headless \
            php7.0-cli \
            haskell-platform \
            libjavascriptcoregtk-4.0-bin \
            golang ruby \
            mono-runtime mono-mcs
