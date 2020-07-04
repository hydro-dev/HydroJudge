#!/bin/bash

request(){
    curl "https://vijos.org/d/hydro/$1" -b cookie -H 'User-Agent: Hydro-Registry' $2 $3 $4 $5 $6 $7 $8 $9
}

csrf(){
    p=$*
    t=${p#*\"csrf_token\" value=\"}
    echo ${t%%\">*}
}

if [ ! -f "cookie" ]
then
    curl "https://vijos.org/login" -c cookie -H 'User-Agent: Hydro-Registry' -d "uname=${upload_username}" -d "password=${upload_password}"
fi

p=$(request "p/${upload_id}/upload" -o /dev/null -s -w %{http_code})
if [ $p == '404' ]
then
    CsrfToken=$(csrf $(request "p/create"))
    request "p/create" -d "title=${upload_name}" -d "numeric_pid=on" -d "content=${upload_id}" -d "csrf_token=${CsrfToken}"
fi

CsrfToken=$(csrf $(request "p/${upload_id}/upload" -s))
request "p/${upload_id}/upload" -F "file=@${upload_name}.zip" -F "csrf_token=$CsrfToken"
