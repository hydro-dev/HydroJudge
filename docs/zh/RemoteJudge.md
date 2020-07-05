## 如何使用 RemoteJudge 功能
题目的样例配置文件 `config.yaml` 已放置于 [testdata_remotejudge.yaml](../../examples/testdata_remotejudge.yaml)。  
如果 `username` 或 `password` 项没有填写，用户需要自行指定评测用账户。  

您可以在您的代码中使用以下注释来传入参数： `<j:optionName=optionValue>`   
目前为止，可用的参数共 `username` `password` `token` `language` 四个。

使用您自己的账号登录： `<j_username:anotherUsername> <j:password=anotherPassword>` 或 `<j:token=yourToken>`  
使用 `<j:language=languageName>` 来指定您使用的语言（通常用于语言列表中没有出现但远端OJ提供了支持的语言）。  
