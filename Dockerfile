FROM node:10-stretch-slim
COPY . /jd5
WORKDIR /jd5
RUN mkdir -p /jd5/simple-sandbox /root/.config/jd5 && \
    apt-get update && \
    apt-get install -y unzip python3 python3-dev build-essential libboost-all-dev && \
    yarn
COPY --from=vijos/jd4 / /opt/sandbox/rootfs
CMD bash -c "cd /jd5 && jd5/daemon.js"