## How to use RemoteJudge
The sample config.yaml is at [testdata_remotejudge.md](../examples/testdata_remotejudge.yaml).  
If `username` or `password` field is empty, users have to use their account to submit.  

You can write a comment in your code in the format `<j:optionName=optionValue>` to pass options.  
Until now, `username` `password` `token` `language` options are valid.  

Login to your account using `<j:username=anotherUsername> <j:password=anotherPassword>` or just submit `<j:token=yourToken>`.  
Sepecific Your Language using `<j:language=languageName>` (If remote oj supports).  

## 如何使用 RemoteJudge 功能
题目的样例配置文件 `config.yaml` 已放置于 [testdata_remotejudge.md](../examples/testdata_remotejudge.yaml)。  
如果 `username` 或 `password` 项没有填写，用户需要自行指定评测用账户。  

您可以在您的代码中使用以下注释来传入参数： `<j:optionName=optionValue>`   
目前为止，可用的参数共 `username` `password` `token` `language` 四个。

使用您自己的账号登录： `<j_username:anotherUsername> <j:password=anotherPassword>` 或 `<j:token=yourToken>`  
使用 `<j:language=languageName>` 来指定您使用的语言（通常用于语言列表中没有出现但远端OJ提供了支持的语言）。  