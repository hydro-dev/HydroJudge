# Judge Daemon

[English](docs/en/README.md)

## 介绍
HydroJudge 是一个用于信息学算法竞赛的高效评测后端。  
和之前的版本相比，HydroJudge 支持了自定义比较器、子任务、交互器等多种新特性。  

## 帮助中心

- [RemoteJudge](docs/zh/RemoteJudge.md)

## 安装与使用

前置需求:

- Linux 4.4+
- NodeJS 10+

下载本仓库，并切换到仓库目录。

```sh
npm install -g yarn # 如果已经安装yarn请跳过该步骤
yarn
```

创建设置目录 `~/.config/hydro` ，并放置 `judge.yaml` ，配置文件格式详见 [examples/judge.yaml](examples/judge.yaml)  
启动 [go-sandbox](https://github.com/criyle/go-judge)，监听端口5050。  
您应当以 root 身份运行。  

```sh
node judge/daemon.js
```

## 设置

- 自定义配置文件位置: `--config=/path/to/config` 
- 自定义语言文件位置: `--langs=/path/to/langs`
- 自定义临时目录: `--tmp=/path/to/tmp`
- 自定义缓存目录: `--cache=/path/to/cache`
- 自定义文件目录: `--files=/path/to/files`
- 自定义沙箱地址: `--execute=http://executionhost/`

## 测试数据格式

[测试数据格式](docs/zh/Testdata.md)

在压缩包中添加 config.yaml （无此文件表示自动识别，默认1s, 256MB）。
见 [测试数据格式](examples/testdata.yaml)

为旧版评测机设计的数据包仍然可用。
针对 problem.conf 的兼容性测试仍在进行中。
