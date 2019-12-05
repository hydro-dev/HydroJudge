#include <node_api.h>
#include <unistd.h>
napi_value _pipe(napi_env env, napi_callback_info info) {
    int desc[2];
    napi_value object, read, write;
    napi_create_object(env, &object);
    pipe(desc);
    napi_create_int32(env, desc[0], &read);
    napi_create_int32(env, desc[1], &write);
    napi_set_named_property(env, object, "read", read);
    napi_set_named_property(env, object, "write", write);
    return object;
}
napi_value Init(napi_env env, napi_value exports) {
    napi_value method;
    napi_create_function(env, "pipe", NAPI_AUTO_LENGTH, _pipe, NULL, &method);
    return method;
}
NAPI_MODULE(pipe, Init)