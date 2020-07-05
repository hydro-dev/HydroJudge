## How to configure testdata

- [Auto](#Auto)
- [Using config.yaml (suggested)](#Config.yaml)
- [Using config.ini (legacy)](#Config.ini)

## Auto

File tree:

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

Judge will use `1s, 256MB` limit as default.
Filename should be as below:

Input files: `([a-zA-Z0-9]*[0-9]+.in)|(input[0-9]+.txt)`  
Output files: `([a-zA-Z0-9]*[0-9]+.(out|ans))|(output[0-9]+.txt)`  

## Config.yaml

// TODO(masnn)

## Config.ini

File tree:

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
