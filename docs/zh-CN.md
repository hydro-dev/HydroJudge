# Judge Daemon

## 介绍
jd5 是一个用于信息学算法竞赛的高效评测后端。
和之前的版本相比，jd5 支持了自定义比较器、子任务、交互器等多种新特性。

## 安装与使用

### 使用docker部署

前置需求:

- Linux 4.4+
- Docker

Docker镜像还未构建。

### 手动安装

前置需求:

- Linux 4.4+
- NodeJS 10+

下载本仓库，并切换到仓库目录。

```sh
npm install -g yarn // 如果已经安装yarn请跳过该步骤
yarn
```

您应当为沙箱准备一个rootfs，并放置于 `/opt/sandbox/rootfs`。
创建设置目录 `~/.config/jd5` ，并放置 `config.yaml` ，配置文件格式详见 [examples/config.yaml](examples/config.yaml)

使用以下命令启动评测机，第一次运行需要创建 cgroup ，所以您应当以 root 身份运行。

```sh
node jd5/daemon.js
```

## 测试数据格式

在压缩包中添加 config.yaml （无此文件表示自动识别，默认1s, 256MB）。
见 [测试数据格式](examples/testdata.yaml)

为旧版评测机设计的数据包仍然可用。
