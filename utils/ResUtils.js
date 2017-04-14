/**用于接口请求数据封装*/
function call(res, code, message, result) {
    let obj = {
        code: code,
        message: message
    };
    if (result) {
        obj.result = result;
    }
    res.send(obj);
}
function callFail(res, message, result) {
    call(res, -1, message, result);
}
function callSuccess(res, message, result) {
    call(res, 0, message, result);
}
function err(res) {
    callFail(res, '服务器异常，请稍后重试');
}
module.exports = {
    call: call,
    callFail: callFail,
    callSuccess: callSuccess,
    err: err
}