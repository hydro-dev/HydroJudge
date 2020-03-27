## How to use RemoteJudge
The sample config.yaml is at [testdata_remotejudge.md](../examples/testdata_remotejudge.yaml).  
If `username` or `password` field is empty, users have to use their account to submit.  

You can write a comment in your code in the format `<j:optionName=optionValue>` to pass options.  
Until now, `username` `password` `token` `language` options are valid.  

Login to your account using `<j:username=anotherUsername> <j:password=anotherPassword>` or just submit `<j:token=yourToken>`.  
Sepecific Your Language using `<j:language=languageName>` (If remote oj supports).  