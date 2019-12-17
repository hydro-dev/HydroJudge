FROM node:10-stretch-slim
COPY --from=vijos/jd4 / /opt/sandbox/rootfs
COPY . /jd5
WORKDIR /jd5
RUN mkdir -p /root/.config/jd5 && \
    apt-get update && \
    apt-get install -y unzip python g++ make && \
    yarn && \
    apt-get -y remove python g++ make && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*
CMD bash -c "cd /jd5 && node jd5/daemon.js"
