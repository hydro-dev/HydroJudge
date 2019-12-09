# Judge Daemon

[中文文档](docs/zh-CN.md)

## Introduction

jd5 is a judging daemon for programming contests like OI and ACM. It is called
jd5 because we had jd, jd2, jd3, jd4 before. Unlike previous versions,
jd5 supports custom judge, subtask and other many new features.

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

Then use `docker run -d -v ./config.yaml:/root/.config/jd5/config.yaml -v ./cache /root/.cache/jd5 masnn/jd5` to start.

## Development

Prerequisites:

- Linux 4.4+
- NodeJS (Tested on node v10.16.2, not sure about other versions)

Use the following command to install nodejs requirements:

```sh
yarn
```

The nodejs libraries require [Unknown].

Put `config.yaml` and `langs.yaml` in the configuration directory, usually
in `$HOME/.config/jd5`. `config.yaml` includes the server address, user and
password and `langs.yaml` includes the compiler options. Examples can be found
under the `examples` directory.


Use the following command to run the daemon:

```sh
node jd5/daemon.js
```

Note that this requires a `sudo` to create cgroups on first execution.

## FAQ

### How are the programs sandboxed?

We unshare everything (namely mount, uts, ipc, user, pid and net), and then
create a root filesystem using tmpfs and bind mount, finally `pivot_root`
into it. We also use cgroup to limit the time, memory and number of processes
of user execution.

### Why are the sandboxes reused?

We noticed that sandbox creation took around 100ms, therefore becomes the
bottleneck while judging small programs. With sandbox pooling, we see 300-400
executions per second on our development machine.

## Copyright and License

Copyright (c) 2019 Vijos Dev Team.  All rights reserved.

We havent decided which license to use :)
