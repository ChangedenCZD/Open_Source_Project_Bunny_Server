/**
 * Created by Changeden on 2017/3/19.
 * 文本工具类
 */
function checkEng(str) {
    var patt = /^[A-Za-z0-9]+$/ig;
    return patt.test(str);
}
function checkLength(str, left, right) {
    return str && str.length >= left && str.length <= right
}

String.prototype.replaceAll = function (reallyDo, replaceWith, ignoreCase) {/*定义replaceAll方法*/
    if (!RegExp.prototype.isPrototypeOf(reallyDo)) {
        return this.replace(new RegExp(reallyDo, (ignoreCase ? "gi" : "g")), replaceWith);
    } else {
        return this.replace(reallyDo, replaceWith);
    }
};
module.exports.checkEng = checkEng;
module.exports.checkLength = checkLength;