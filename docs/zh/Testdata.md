## 如何配置测试数据

- [自动配置](#Auto)
- [使用 config.yaml (推荐)](#Config.yaml)
- [使用 config.ini](#Config.ini)

## Auto

压缩包内文件格式如下：

```
Testdata.zip
|
+- input0.in 
+- input1.in
+- input2.in
+- output0.out
+- output1.out
+- output2.out
```

评测机会自动获取测试包内的文件。并使用默认1s,256MB的限制。  
文件命名格式如下：  

输入文件：`([a-zA-Z0-9]*[0-9]+.in)|(input[0-9]+.txt)`  
输出文件：`([a-zA-Z0-9]*[0-9]+.(out|ans))|(output[0-9]+.txt)`  

## Config.yaml

压缩包内文件格式如下：

```
Testdata.zip
|
+- config.yaml
+- input0.in
+- input1.in
+- input2.in
+- output0.out
+- output1.out
+- output2.out
```

// TODO(masnn)

## Config.ini

压缩包内文件格式如下：

```
Testdata.zip
|
+- Config.ini
+- Input
|   +- input0.in 
|   +- input1.in
|   +- input2.in
+- Output
    +- output0.out
    +- output1.out
    +- output2.out
```

```
Config.ini格式
第一行包含一个整数n，表示总共有n组数据(即Input目录中文件总数等于Output目录中文件总数等于n)；
接下来n行，第k行代表第k个测试点，格式为：
[输入文件名]|[输出文件名]|[时限(单位为秒)]|[得分]|[内存限制(单位为KiB)]
其中，输入和输出文件名为 Input 或者 Output 目录中的文件名（不包含Input或者Output目录），且所有数据点得分之和必须为100，如：
input0.in|output0.out|1|10|256000
```