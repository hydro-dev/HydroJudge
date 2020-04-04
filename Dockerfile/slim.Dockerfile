FROM hydrooj/judger:alpine
ENV FPC_VERSION="3.0.4" \
    FPC_ARCH="x86_64-linux"

RUN apk add gcc g++ && \
    curl -sSL https://raw.githubusercontent.com/hydro-dev/HydroJudger/master/examples/langs.slim.yaml >/config/langs.yaml && \
    apk add --no-cache binutils && \
    cd /tmp && \
    wget "ftp://ftp.hu.freepascal.org/pub/fpc/dist/${FPC_VERSION}/${FPC_ARCH}/fpc-${FPC_VERSION}.${FPC_ARCH}.tar" -O fpc.tar && \
    tar xf "fpc.tar" && \
    cd "fpc-${FPC_VERSION}.${FPC_ARCH}" && \
    rm demo* doc* && \
    echo -e '/usr\nN\nN\nN\n' | sh ./install.sh && \
    find "/usr/lib/fpc/${FPC_VERSION}/units/${FPC_ARCH}/" -type d -mindepth 1 -maxdepth 1 \
        -not -name 'fcl-base' \
        -not -name 'rtl' \
        -not -name 'rtl-console' \
        -not -name 'rtl-objpas' \
        -exec rm -r {} \; && \
    rm -r "/tmp/"* && \
    rm -rf /var/cache/apk/*
