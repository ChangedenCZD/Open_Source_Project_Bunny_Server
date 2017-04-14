/**
 * Created by Changeden on 2017/3/27.
 */
let TextUtils = require('../utils/TextUtils');
let UUID = require('node-uuid');
function formatV1() {
    return formatObject(UUID.v1());
}
function formatV4() {
    return formatObject(UUID.v4());
}
function formatObject(uuidObj) {
    if(uuidObj){
        return uuidObj.toString().replaceAll('-', '');
    }else{
        return '';
    }
}
module.exports=UUID;
module.exports.formatV1 = formatV1;
module.exports.formatV4 = formatV4;