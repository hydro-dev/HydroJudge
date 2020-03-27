# Judge Daemon

[中文文档](docs/zh/README.md)

## Introduction

HydroJudger is a judging daemon for programming contests like OI and ACM. 
HydroJudger supports custom judge, subtask and other many new features.

## Help Center

- [RemoteJudge](docs/en/RemoteJudge.md)

## Usage

Prerequisites:

- Linux 4.4+
- Docker

Create `judger.yaml`:

```yaml
hosts:
  localhost:
    server_url: e.g. https://vijos.org
    uname: Judge account username
    password: Judge account password
```

Then use `docker run --privileged -d -v ./config.yaml:/root/.config/hydro/judger.yaml hydrooj/judger:default` to start.  
Hint: there are 3 tags built for docker:  

- `hydrooj/judger:latest` No compiler installed
- `hydrooj/judger:default` Default compiler for vijos
- `hydrooj/judger:slim` C C++ Pascal


## Development

Prerequisites:

- Linux
- NodeJS Version 10+

Use the following command to install nodejs requirements:

```sh
yarn
```

Put `judger.yaml` and `langs.yaml` in the configuration directory, usually
in `$HOME/.config/hydro/`. `judger.yaml` includes the server address, user and
password and `langs.yaml` includes the compiler options. Examples can be found
under the `examples` directory.

Run the [executor-server](https://github.com/criyle/go-judge) first,  
And use the following command to run the daemon:  

```sh
node judger/daemon.js
```

## Testdata format
[Testdata format](docs/en/Testdata.md)

## Copyright and License

Copyright (c) 2020 Hydro Dev Team.  All rights reserved.

License: GPL-3.0-only
