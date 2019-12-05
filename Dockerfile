FROM node:13-stretch-slim
COPY . /jd5
WORKDIR /jd5
RUN mkdir -p /jd5/simple-sandbox /root/.config/jd5 && \
    apt-get update && \
    apt-get install -y curl unzip python3 python3-dev build-essential libboost-all-dev && \
    yarn && \
    curl -o /jd5/simple-sandbox/t.zip https://cdn.vijos.org/fs/22d8af87bb2f84e938a03e3fa604247c04b8a4fc && \
    unzip /jd5/simple-sandbox/t.zip -d /jd5/simple-sandbox && rm /jd5/simple-sandbox/t.zip && \
    yarn add ./simple-sandbox
COPY --from=vijos/jd4 / /opt/sandbox/rootfs
CMD bash -c "cd /jd5 && jd5/daemon.js"