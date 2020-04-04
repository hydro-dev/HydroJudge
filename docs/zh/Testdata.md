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

如果您需要设置时空限制，请使用如下设置项：

```yaml
time: 1s
memory: 256m
```

如果您需要针对测试点单独配置，请使用如下设置项：

```yaml
subtasks:
  - score: 30 # Subtask 1 为 30 分
    type: min # 计分方式为 min （取测试点得分最小值） 支持 sum, max, min，此设置可忽略。默认值：min
    time: 1s  # 时间限制 1s，此设置可忽略，默认值：1s
    memory: 64m # 空间限制 64m，此设置可忽略，默认值：256m
    cases: #  所包含的测试点列表
      - input: a1.in
        output: a1.out
      - input: a2.in
        output: a2.out
  - score: 70 
    time: 0.5s
    memory: 32m
    cases:
      - input: b1.in
        output: b1.out
      - input: b2.in
        output: b2.out
```

如果您需要自定义比较器，请使用如下设置项：
注意：使用Testlib编写比较器时，不要在文件中包含testlib.h。

```yaml
checker_type: default # 比较器类型，支持的值有 default, hustoj, lemon, qduoj, syzoj, testlib，默认为default（内置比较器）
checker: chk.cpp # 自定义比较器文件名
```

如果您要在程序编译/运行过程中添加额外的文件，请使用如下设置项：

```yaml
user_extra_files:
  - extra_input.txt # 文件名，每行一个
  - extra_header.hpp
judge_extra_files:
  - extra_file.txt
  - extra_info.txt
```

如果需要配置交互题，模板题，提交答案题，请参照 [testdata.yaml](../../examples/testdata.yaml)
如果需要配置RemoteJudge，请参照 [testdata.yaml](../../examples/testdata_remotejudge.yaml)

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