FROM debian:stretch AS rootfs
RUN apt-get update && \
    apt-get install -y gcc g++ fp-compiler && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

FROM node:10-stretch-slim
COPY --from=rootfs / /opt/sandbox/rootfs
COPY . /jd5
WORKDIR /jd5
RUN mkdir -p /root/.config/jd5 && \
    apt-get update && \
    apt-get install -y unzip python make g++ && \
    yarn && \
    apt-get remove -y g++ python make && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    cp /jd5/examples/langs.slim.yaml /root/.config/jd5/langs.yaml && \
    touch /opt/sandbox/rootfs/dev/null
CMD bash -c "cd /jd5 && node jd5/daemon.js"
