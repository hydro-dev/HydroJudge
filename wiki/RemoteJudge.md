## How to use RemoteJudge
The sample config.yaml is at [testdata_remotejudge.md](../examples/testdata_remotejudge.yaml).  
If `username` or `password` field is empty, users have to use their account to submit.  

You can write a comment in your code as below to use another account to submit.  

```
jd5_username=anotherUsername
jd5_password=anotherPassword
```

or

```
jd5_token=yourCookie
```

## 如何使用 RemoteJudge 功能
题目的样例配置文件 `config.yaml` 已放置于 [testdata_remotejudge.md](../examples/testdata_remotejudge.yaml)。  
如果 `username` 或 `password` 项没有填写，用户需要自行指定评测用账户。  

你可以在你提交的代码中插入如下的注释来指定评测用账号：

```
jd5_username=你的用户名
jd5_password=你的密码
```

or

```
jd5_token=有效的cookie
```