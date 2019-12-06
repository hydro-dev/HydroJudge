#include <node_api.h>
#include <unistd.h>
#define ERRMSG "Cannot create pipe"
#define CALL(env, call, errmsg)                                         \
    {                                                                   \
        napi_status call_status = (call);                               \
        if (call_status != napi_ok) napi_throw_error(env, "1", errmsg); \
    }
napi_value _pipe(napi_env env, napi_callback_info info) {
    int desc[2];
    napi_value object, read, write;
    CALL(env, napi_create_object(env, &object), ERRMSG);
    int status = pipe(desc);
    if (status) napi_throw_error(env, "1", ERRMSG);
    CALL(env, napi_create_int32(env, desc[0], &read), ERRMSG);
    CALL(env, napi_create_int32(env, desc[1], &write), ERRMSG);
    CALL(env, napi_set_named_property(env, object, "read", read), ERRMSG);
    CALL(env, napi_set_named_property(env, object, "write", write), ERRMSG);
    return object;
}
napi_value Init(napi_env env, napi_value exports) {
    napi_value method;
    napi_create_function(env, "pipe", NAPI_AUTO_LENGTH, _pipe, NULL, &method);
    return method;
}
NAPI_MODULE(pipe, Init)