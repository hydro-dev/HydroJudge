# Judge Daemon

[中文文档](docs/zh-CN.md)

## Introduction

jd5 is a judging daemon for programming contests like OI and ACM. It is called
jd5 because we had jd, jd2, jd3, jd4 before. Unlike previous versions,
jd5 supports custom judge, subtask and other many new features.

## Help Center

- [RemoteJudge](docs/RemoteJudge.md)

## Usage

Prerequisites:

- Linux 4.4+
- Docker

Create `config.yaml`:

```yaml
hosts:
  localhost:
    server_url: e.g. https://vijos.org
    uname: Judge account username
    password: Judge account password
```

Then use `docker run --privileged -d -v ./config.yaml:/root/.config/jd5/config.yaml masnn/jd5:default` to start.  
Hint: there are 3 tags built for docker:  

- `masnn/jd5:latest` No compiler installed
- `masnn/jd5:default` Default compiler for vijos
- `masnn/jd5:slim` C C++ Pascal


## Development

Prerequisites:

- Linux 4.4+
- NodeJS (Tested on node v10.16.2, not sure about other versions)

Use the following command to install nodejs requirements:

```sh
yarn
```

Put `config.yaml` and `langs.yaml` in the configuration directory, usually
in `$HOME/.config/jd5`. `config.yaml` includes the server address, user and
password and `langs.yaml` includes the compiler options. Examples can be found
under the `examples` directory.

Run the [executor-server](https://github.com/criyle/go-judge) first,  
And use the following command to run the daemon:  

```sh
node jd5/daemon.js
```

## Copyright and License

Copyright (c) 2020 Vijos Dev Team.  All rights reserved.

License: GPL-3.0-only

## Donate

Donate using alipay:

![alipay.png](./alipay.png)