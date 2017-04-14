let express = require('express');
let router = express.Router();
let fs = require('fs');
let ResUtils = require('../utils/ResUtils');
let DbUtils = require('../utils/DatabaseUtils');
let TextUtils = require('../utils/TextUtils');
let multer = require('multer');
let upload = multer({dest: 'uploads/'});
let DateUtils = require('../utils/DateUtils');
let qiniu = require("qiniu");
let config = require('../bin/config.json');

var files;
var filesLength = 0;
var uploadResult;
router.post('/uploads', upload.array('files'), function (req, res, next) {
    let userid = req.header('USER');
    files = req.files;
    tryToSave(userid, res);
    // if (!userid) {
    //     userNotDefine(res, files);
    // } else if (files && files.length > 0) {
    //     filesLength = files.length;
    //     uploadResult = [];
    //     try {
    //         files.forEach((file, index) => {
    //             saveFile(res, file, userid, index)
    //         });
    //     } catch (e) {
    //         fileUploadError(res);
    //     }
    // } else {
    //     console.log('文件不存在');
    //     fileUploadError(res);
    // }
});
function tryToSave(userid, res) {
    if (!userid) {
        userNotDefine(res, files);
    } else if (files && files.length > 0) {
        filesLength = files.length;
        uploadResult = [];
        try {
            files.forEach((file, index) => {
                saveFile(res, file, userid, index)
            });
        } catch (e) {
            fileUploadError(res);
        }
    } else {
        console.log('文件不存在');
        fileUploadError(res);
    }
}
router.post('/upload', upload.single('file'), function (req, res, next) {
    let userid = req.header('USER');
    files = [];
    let file = req.file;
    if (file) {
        files.push(file);
    }
    tryToSave(userid, res);
});
function saveFile(res, file, userid, index) {
    let root = './public/uploads/';
    let userPath = root + userid + '/';
    fs.exists(userPath, function (exists) {
        if (exists) {
            moveFile(file, userPath, res, userid, index);
        } else {
            fs.mkdir(userPath, 0o777, function (err) {
                if (err) {
                    console.log(err);
                    console.log(err.code)
                    if ('EEXIST' == err.code) {
                        moveFile(file, userPath, res, userid, index);
                    } else {
                        throw "file save error";
                    }
                } else {
                    moveFile(file, userPath, res, userid, index);
                }
            });
        }
    });
}
/**上传至七牛*/
function uploadToQiNiu(file, target, user, res, index) {
    qiniu.conf.ACCESS_KEY = config.qiniu.access_key;
    qiniu.conf.SECRET_KEY = config.qiniu.secret_key;
    const key = user + '_' + file.originalname;
    var bucket;
    if (file.mimetype.indexOf('image') === 0) {
        bucket = config.qiniu.bucket.bunny_image;
    } else {
        bucket = config.qiniu.bucket.bunny_file;
    }
    qiniu.io.putFile(new qiniu.rs.PutPolicy(bucket.name + ":" + key).token(),
        key, target, new qiniu.io.PutExtra(), function (err, ret) {
            if (err) {
                // 上传失败， 处理返回代码
                filesLength--;
                console.log(err);
                // fileUploadError(res);
            } else {
                // 上传成功， 处理返回值
                fileUploadSuccess(res, bucket, target, key, user, {size: file.size, index: index});
            }
        });
}
function fileUploadSuccess(res, bucket, target, key, user, extra) {
    uploadResult.push({
        filePath: bucket.root + key,
        diskPath: target,
        userId: user,
        fileName: key,
        extra: extra
    })
    if (filesLength <= uploadResult.length) {
        ResUtils.call(res, 0, "文件上传成功", uploadResult);
    }
}
/**移动文件至静态文件夹*/
function moveFile(file, userPath, res, user, index) {
    const target = userPath + file.originalname;
    fs.rename(file.path, target, function (err) {
        if (err) {
            console.log(err);
            filesLength--;
            throw "file move error";
        } else {
            uploadToQiNiu(file, target, user, res, index);
        }
    });
}
function fileUploadError(res) {
    ResUtils.callFail(res, "文件上传失败");
}
function userNotDefine(res, files) {
    files.forEach((file) => {
        fs.unlink(file.path, function (err) {
            if (err) {
                console.log(err);
            }
        });
    });
    ResUtils.callFail(res, "该用户不存在");
}
module.exports = router;
