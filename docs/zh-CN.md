# Judge Daemon

## 写在前面

[跳过本段](#介绍)   
曾经我们认为这套系统十分先进。  
我们拥有极高的评测效率，安全的沙箱系统与极低的内存占用。  
直到我们遇到了对手 [syzoj](https://github.com/syzoj)。   
他支持自定义比较器，支持提交答案题，支持交互......  
用户的反应也越来越强烈：  
“我们需要SPJ!” 用户们喊道。  
于是就有了第一版未公开的SPJ实现。（很难用）  
随着更多的问题接踵而来，我们迫切的需要更新评测系统。  
于是便有了本项目。  
使用本项目，我们确信您可以获得优于syzoj的评测体验。  

## 介绍
jd5 是一个用于信息学算法竞赛的高效评测后端。  
和之前的版本相比，jd5 支持了自定义比较器、子任务、交互器等多种新特性。  


## 帮助中心

- [RemoteJudge](./RemoteJudge.md)

## 安装与使用

### 使用docker部署

前置需求:

- Linux 4.4+
- Docker

创建 `config.yaml`，文件如下所示

```yaml
hosts:
  localhost: #ID,可更改
    type: vj4 # [vj4,uoj]
    server_url: https://vijos.org/ # 填写vijos服务端地址
    uname: 填写拥有评测权限的用户名
    password: 填写密码
```

之后使用 `docker run -d --privileged -v ./config.yaml:/root/.config/jd5/config.yaml masnn/jd5:default` 即可启动。
提示：为docker预构建了三个版本的镜像：

- `masnn/jd5:latest` 未安装任何编译器，需手动安装
- `masnn/jd5:default` Vijos默认语言的编译器支持
- `masnn/jd5:slim` C C++ Pascal 语言支持

### 手动安装

前置需求:

- Linux 4.4+
- NodeJS 10+

下载本仓库，并切换到仓库目录。

```sh
npm install -g yarn # 如果已经安装yarn请跳过该步骤
yarn
```

创建设置目录 `~/.config/jd5` ，并放置 `config.yaml` ，配置文件格式详见 [examples/config.yaml](examples/config.yaml)  
启动 [go-sandbox](https://github.com/criyle/go-judge)，监听端口5050。  
您应当以 root 身份运行。  

```sh
node jd5/daemon.js
```

## 测试数据格式

在压缩包中添加 config.yaml （无此文件表示自动识别，默认1s, 256MB）。
见 [测试数据格式](examples/testdata.yaml)

为旧版评测机设计的数据包仍然可用。
针对 problem.conf 的兼容性测试仍在进行中。

## 捐助

通过支付宝付款：

![alipay.png](../alipay.png)