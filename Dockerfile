FROM node:10-stretch-slim
COPY --from=vijos/jd4 / /opt/sandbox/rootfs
COPY . /jd5
WORKDIR /jd5
RUN mkdir -p /root/.config/jd5 && \
    apt-get update && \
    apt-get install -y unzip wget python3 python3-dev build-essential libboost-all-dev && \
    yarn && \
    apt-get autoremove -y 
CMD bash -c "cd /jd5 && node jd5/daemon.js"
