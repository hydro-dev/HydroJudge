# Judge Daemon

[English](docs/en/README.md)

## 介绍
HydroJudge 是一个用于信息学算法竞赛的高效评测后端。  
和之前的版本相比，HydroJudge 支持了自定义比较器、子任务、交互器等多种新特性。  


## 帮助中心

- [RemoteJudge](docs/zh/RemoteJudge.md)

## 安装与使用

### 使用docker部署

创建 `config.yaml`，文件如下所示

```yaml
hosts:
  localhost: #ID,可更改
    type: vj4 # [vj4,uoj]
    server_url: https://vijos.org/ # 填写vijos服务端地址
    uname: 填写拥有评测权限的用户名
    password: 填写密码
```

之后使用 `docker run -d --privileged -v /path/to/config.yaml:/config/config.yaml hydrooj/judge:default` 即可启动。
**将 /path/to/config.yaml 替换为您创建的文件的绝对路径！** 

提示：为docker预构建了四个版本的镜像：

- `hydrooj/judge:alpine` 基于AlpineLinux构建的最精简镜像  
- `hydrooj/judge:latest` 未安装任何编译器，需手动安装  
- `hydrooj/judge:default` Vijos默认语言的编译器支持  
- `hydrooj/judge:slim` 基于AlpineLinux，预装了 C C++ Pascal 语言支持  

### 手动安装

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
