# Judge Daemon

[中文文档](../../README.md)

## Introduction

HydroJudge is a judging daemon for programming contests like OI and ACM. 
HydroJudge supports custom judge, subtask and other many new features.

## Help Center

- [RemoteJudge](./RemoteJudge.md)

## Usage

### Run packed executable file (suggested)

Step 1: Download the latest packed files at [GithubActions](https://github.com/hydro-dev/HydroJudge/actions)  
You should download one of the files below:

- Judge_win_amd64.exe
- Judge_linux_amd64
- Judge_macos_amd64

Step 2: Create configuration file  

```yaml
#$HOME/.config/hydro/judge.yaml
hosts:
  localhost:
    server_url: e.g. https://vijos.org
    uname: Judge account username
    password: Judge account password
```

Step 3: Run! 

```sh
chmod +x ./Judge
./Judge
```

### Run with docker

Create `config.yaml`:

```yaml
hosts:
  localhost:
    server_url: e.g. https://vijos.org
    uname: Judge account username
    password: Judge account password
```

Then use `docker run --privileged -d -v /path/to/config.yaml:/config/config.yaml hydrooj/judge:default` to start.  
**Replace /path/to/judge.yaml with your ABSOLUTE PATH!**  
Hint: there are 4 tags built for docker:  

- `hydrooj/judge:alpine` Smallest image based on AlpineLinux  
- `hydrooj/judge:latest` No compiler installed  
- `hydrooj/judge:default` Default compiler for vijos  
- `hydrooj/judge:slim` C C++ Pascal  

## Configuration

- Change the config file path: `--config=/path/to/config` 
- Change the language file path: `--langs=/path/to/langs`
- Change temp directory: `--tmp=/path/to/tmp`
- Change cache directory: `--cache=/path/to/cache`
- Change files directory: `--files=/path/to/files`
- Change execution host: `--execute=http://executionhost/`

## Development

Prerequisites:

- Linux
- NodeJS Version 10+

Use the following command to install nodejs requirements:

```sh
yarn
```

Put `judge.yaml` and `langs.yaml` in the configuration directory, usually
in `$HOME/.config/hydro/`. `judge.yaml` includes the server address, user and
password and `langs.yaml` includes the compiler options. Examples can be found
under the `examples` directory.

Run the [executor-server](https://github.com/criyle/go-judge) first,  
And use the following command to run the daemon:  

```sh
node judge/daemon.js
```

## Testdata format
[Testdata format](./Testdata.md)

## Copyright and License

Copyright (c) 2020 Hydro Dev Team.  All rights reserved.

License: GPL-3.0-only
