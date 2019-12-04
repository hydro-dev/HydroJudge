FROM ubuntu:18.04 AS build
COPY . /jd5
RUN mkdir -p /jd5/simple-sandbox /root/.config/jd5 && \
    apt-get update && apt-get install -y curl unzip python3 python3-dev && \
    curl -sL https://deb.nodesource.com/setup_10.x | bash && \
    apt-get install -y nodejs build-essential libboost-all-dev && \
    npm install yarn -g && \
    cd /jd5 && yarn && \
    curl -o /jd5/simple-sandbox/t.zip https://cdn.vijos.org/fs/22d8af87bb2f84e938a03e3fa604247c04b8a4fc && \
    unzip /jd5/simple-sandbox/t.zip -d /jd5/simple-sandbox && rm /jd5/simple-sandbox/t.zip && \
    yarn add ./simple-sandbox 
FROM node:13.2.0-alpine
COPY --from=build /jd5 /jd5
COPY --from=vijos/jd4 / /opt/sandbox/rootfs
CMD bash -c "cd /jd5 && jd5/daemon.js"