/**微信认证相关*/
var express = require('express');
var router = express.Router();
let Res = require('../utils/ResUtils');
let config = require('../bin/config.json');
var request = require('request');
let DBUtils = require('../utils/DatabaseUtils');
let UUID = require('../utils/UUIDUtils');
let DateUtils = require('../utils/DateUtils');

router.get('/', function (req, res, next) {
    res.redirect('http://www.changeden.net');
});

/** 获取小程序用户ID*/
router.get('/mp/user/:openid', function (req, res, next) {
    let openid = req.params.openid;

    function success(user) {
        Res.callSuccess(res, '验证成功', user);
    }

    if (openid) {
        let client = DBUtils.connectServer();
        var sql = "SELECT * FROM user WHERE `openid` = ? LIMIT 1";
        sql = DBUtils.format(sql, [openid]);
        client.query(sql, function (err, result) {
            if (err) {
                console.log(err);
                Res.err(res);
            } else {
                if (result.length < 1) {
                    function genUserId() {
                        return UUID.formatV4().substr(14, 4) + UUID.formatV1().substr(24, 4) + UUID.formatV4().substr(4, 4);
                    }

                    function checkAndReg() {
                        let userid = genUserId();
                        var sql = "SELECT count(*) FROM user WHERE `userid` = ?";
                        sql = DBUtils.format(sql, [userid]);
                        client.query(sql, function (err, result) {
                            if (err) {
                                Res.err(res)
                            } else {
                                if (result[0]['count(*)'] > 0) {
                                    checkAndReg();
                                } else {
                                    sql = "insert into user values(?,?)";
                                    sql = DBUtils.format(sql, [openid, userid]);
                                    client.query(sql, function (err, result) {
                                        if (err) {
                                            Res.err(res)
                                        } else {
                                            success({
                                                openid: openid,
                                                userid: userid
                                            });
                                        }
                                    });
                                }
                            }
                        })
                    }

                    checkAndReg();
                } else {
                    let user = result[0];
                    success(user);
                }
            }
        })
    } else {
        Res.callFail(res, '用户异常，请重新打开小程序');
    }
});

function getMPUserInfo(userid, res) {
    function success(user) {
        Res.callSuccess(res, '信息获取成功', user);
    }

    let client = DBUtils.connectServer();
    var sql = "select * from user_info where `userid` = ? limit 1";
    sql = DBUtils.format(sql, [userid]);
    client.query(sql, function (err, result) {
        if (err) {
            console.log(err);
            Res.err(res)
        } else {
            let user = result[0] || {};
            success(user);
        }
    });
}
/**获取小程序用户信息*/
router.get('/mp/user/id/:userid', function (req, res) {
    let userid = req.params.userid;

    if (userid) {
        getMPUserInfo(userid, res);
    } else {
        Res.callFail(res, '用户ID异常');
    }
});
/**更新小程序用户信息*/
router.put('/mp/user/id/:userid', function (req, res) {
    let userid = req.params.userid;
    let body = req.body;
    body.userid = userid;

    if (userid) {
        let client = DBUtils.connectServer();
        var sql = "select count(*) from user_info where `userid` = ?";
        sql = DBUtils.format(sql, [userid]);
        client.query(sql, function (err, result) {
            if (err) {
                console.log(err);
                Res.err(res)
            } else {
                let nickName = body.nickName || '';
                let avatarUrl = body.avatarUrl || '';
                let gender = body.gender || 0;
                let province = body.province || '';
                let city = body.city || '';
                let country = body.country || '';
                let language = body.language || '';
                let update = DateUtils.getTime();
                var sql;
                if (result[0]['count(*)'] > 0) {
                    var set = "";
                    if (nickName) {
                        set += "`nickName`='" + nickName + "',"
                    }
                    if (avatarUrl) {
                        set += "`avatarUrl`='" + avatarUrl + "',"
                    }
                    if (gender) {
                        set += "`gender`=" + gender + ","
                    }
                    if (province) {
                        set += "`province`='" + province + "',"
                    }
                    if (city) {
                        set += "`city`='" + city + "',"
                    }
                    if (country) {
                        set += "`country`='" + country + "',"
                    }
                    if (language) {
                        set += "`language`='" + language + "',"
                    }
                    set += "`update`=" + update;
                    sql = "update user_info set " + set + " where `userid`=?;";
                } else {
                    var keys = "`userid`,";
                    var values = "?,";
                    if (nickName) {
                        keys += "`nickName`,";
                        values += "'" + nickName + "',";
                    }
                    if (avatarUrl) {
                        keys += "`avatarUrl`,";
                        values += "'" + avatarUrl + "',";
                    }
                    if (gender) {
                        keys += "`gender`,";
                        values += gender + ",";
                    }
                    if (province) {
                        keys += "`province`,";
                        values += "'" + province + "',";
                    }
                    if (city) {
                        keys += "`city`,";
                        values += "'" + city + "',";
                    }
                    if (country) {
                        keys += "`country`,";
                        values += "'" + country + "',";
                    }
                    if (language) {
                        keys += "`language`,";
                        values += "'" + language + "',";
                    }
                    keys += "`create`,`update`";
                    values += update + ',' + update;
                    sql = "insert into user_info(" + keys + ") values(" + values + ");";
                }
                sql = DBUtils.format(sql, [userid]);
                client.query(sql, function (err, result) {
                    if (err) {
                        console.log(err);
                        Res.err(res);
                    } else {
                        getMPUserInfo(userid, res);
                    }
                });
            }
        });
    } else {
        Res.callFail(res, '用户ID异常');
    }
});

/**获取小程序的openid*/
router.get('/mp/openid/:appName/:code', function (req, res) {
    let params = req.params;
    let appName = params.appName;
    let code = params.code;
    let app = config.wechat.mp[appName];
    if (app) {
        if (code) {
            var url = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + app.appid
                + '&secret=' + app.secret
                + '&js_code=' + code + '&grant_type=authorization_code';
            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body);
                    if (body.expires_in) {
                        Res.callSuccess(res, '用户身份验证成功', body);
                    } else {
                        codeError();
                    }
                } else {
                    codeError();
                }
            })
        } else {
            codeError();
        }
    } else {
        Res.callFail(res, '不存在该应用');
    }
    function codeError() {
        Res.callFail(res, 'Code无效');
    }
});
/**小程序用户发布动态*/
router.put('/mp/post/:userid', function (req, res) {
    let userid = req.params.userid;
    if (userid) {
        let body = req.body;
        let dir = body.dir || 'default';
        let images = body.images || [];
        let desc = body.desc || '';
        if (images.length > 0 || desc) {
            let postid = UUID.formatV4();
            let time = DateUtils.getTime();
            let client = DBUtils.connectServer();
            var sql = "insert into user_post values(?,?,?,?,?,?)";
            sql = DBUtils.format(sql, [postid, userid, desc, body.pub || 1, time, time]);
            client.query(sql, (err, result) => {
                if (err) {
                    console.log(err);
                    Res.callFail(res, '发布失败，请重试');
                } else {
                    if (images.length > 0) {
                        sql = "insert into post_image(`postid`,`image_url`,`dir`) values";
                        images.forEach((item, index) => {
                            sql += "('" + postid + "',?,'" + dir + "'),"
                        });
                        sql = sql.substr(0, sql.length - 1);
                        sql = DBUtils.format(sql, images);
                        client.query(sql, (err, result) => {
                            if (err) {
                                console.log(err);
                                sql = "delete from user_post where `postid` = ?";
                                sql = DBUtils.format(sql, [postid]);
                                client.query(sql, (err, res) => {
                                });
                                Res.callFail(res, '内容异常');
                            } else {
                                Res.callSuccess(res, '发布成功')
                            }
                        })
                    } else {
                        Res.callSuccess(res, '发布成功')
                    }
                }
            });
        } else {
            Res.callFail(res, '内容异常');
        }
    } else {
        Res.callFail(res, '用户ID异常');
    }
});
router.get('/mp/post/list', function (req, res) {
    let params = req.query;
    let size = parseInt(params.size) || 20;
    let page = parseInt(params.page) || 1;
    let userid = params.userid;
    let selfid = params.selfid || '';
    let client = DBUtils.connectServer();
    var sql = "select p.postid,p.userid,u.nickName,u.avatarUrl,p.description,p.update,count(l.userid) isLike,count(fav.userid) isFav,count(f.userid_from) isFollow,GROUP_CONCAT(i.image_url) from `user_post` p left JOIN `post_image` i on i.postid = p.postid LEFT JOIN `user_info` u on p.`userid` = u.`userid` LEFT JOIN `post_like` l on l.postid = p.postid and l.userid = ? LEFT JOIN `post_favorites` fav on fav.postid = p.postid and fav.userid = ? LEFT JOIN `user_follow` f on f.userid_from = ? and f.userid_to = p.userid WHERE " + (userid ? "u.`userid` = '" + userid + "' and " : "") + " p.`public` = 1 or p.`userid` = ? GROUP BY p.postid ORDER BY p.update desc LIMIT ?,?;";
    sql = DBUtils.format(sql, [selfid, selfid, selfid, selfid, (page - 1) * size, size]);
    client.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            Res.err(res);
        } else {
            let newArray = [];
            result.forEach((item) => {
                newArray.push({
                    postid: item.postid,
                    userid: item.userid,
                    nickName: item.nickName,
                    avatarUrl: item.avatarUrl,
                    description: item.description,
                    update: item.update,
                    isLike: (item.isLike || 0) > 0,
                    isFollow: (item.isFollow || 0) > 0,
                    isFav: (item.isFav || 0) > 0,
                    images: (item["GROUP_CONCAT(i.image_url)"] || '').split(',')
                });
            });
            Res.callSuccess(res, '列表获取成功', newArray);
        }
    });
});
router.put('/mp/post/like/:postid/:userid', (req, res) => {
    let params = req.params;
    let postid = params.postid;
    let userid = params.userid;
    if (postid && userid) {
        let client = DBUtils.connectServer();
        var sql = "insert into `post_like`(`postid`,`userid`) values(?,?);";
        sql = DBUtils.format(sql, [postid, userid]);
        client.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                Res.err(res);
            } else {
                Res.callSuccess(res, '点赞成功', {});
            }
        });
    } else {
        Res.callFail(res, '点赞失败');
    }
});
router.delete('/mp/post/like/:postid/:userid', (req, res) => {
    let params = req.params;
    let postid = params.postid;
    let userid = params.userid;
    if (postid && userid) {
        let client = DBUtils.connectServer();
        var sql = "delete from `post_like` where postid = ? and userid = ?";
        sql = DBUtils.format(sql, [postid, userid]);
        client.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                Res.err(res);
            } else {
                Res.callSuccess(res, '取消点赞成功', {});
            }
        });
    } else {
        Res.callFail(res, '取消点赞失败');
    }
});
router.put('/mp/post/favorites/:postid/:userid', (req, res) => {
    let params = req.params;
    let postid = params.postid;
    let userid = params.userid;
    if (postid && userid) {
        let client = DBUtils.connectServer();
        var sql = "insert into `post_favorites`(`postid`,`userid`) values(?,?);";
        sql = DBUtils.format(sql, [postid, userid]);
        client.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                Res.err(res);
            } else {
                Res.callSuccess(res, '收藏成功', {});
            }
        });
    } else {
        Res.callFail(res, '收藏失败');
    }
});
router.delete('/mp/post/favorites/:postid/:userid', (req, res) => {
    let params = req.params;
    let postid = params.postid;
    let userid = params.userid;
    if (postid && userid) {
        let client = DBUtils.connectServer();
        var sql = "delete from `post_favorites` where postid = ? and userid = ?";
        sql = DBUtils.format(sql, [postid, userid]);
        client.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                Res.err(res);
            } else {
                Res.callSuccess(res, '取消收藏成功', {});
            }
        });
    } else {
        Res.callFail(res, '取消收藏失败');
    }
});
router.put('/mp/post/follow/:toid/:userid', (req, res) => {
    let params = req.params;
    let toid = params.toid;
    let userid = params.userid;
    if (toid && userid) {
        let client = DBUtils.connectServer();
        var sql = "insert into `user_follow`(`userid_to`,`userid_from`) values(?,?);";
        sql = DBUtils.format(sql, [toid, userid]);
        client.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                Res.err(res);
            } else {
                Res.callSuccess(res, '关注成功', {});
            }
        });
    } else {
        Res.callFail(res, '关注失败');
    }
});
router.delete('/mp/post/follow/:toid/:userid', (req, res) => {
    let params = req.params;
    let toid = params.toid;
    let userid = params.userid;
    if (toid && userid) {
        let client = DBUtils.connectServer();
        var sql = "delete from `user_follow` where userid_to = ? and userid_from = ?;";
        sql = DBUtils.format(sql, [toid, userid]);
        client.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                Res.err(res);
            } else {
                Res.callSuccess(res, '取消关注成功', {});
            }
        });
    } else {
        Res.callFail(res, '取消关注失败');
    }
});
router.get('/mp/:userid/follow', (req, res) => {
    let userid = req.params.userid;
    if (userid) {
        let client = DBUtils.connectServer();
        var sql = "SELECT u.*,count(p.postid) postCount FROM `user_follow` f LEFT JOIN `user_info` u ON u.userid = f.userid_to LEFT JOIN `user_post` p on p.userid = u.userid WHERE f.userid_from = ? GROUP BY u.userid DESC;";
        sql = DBUtils.format(sql, [userid]);
        client.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                Res.err(res);
            } else {
                Res.callSuccess(res, '关注列表获取成功', result);
            }
        });
    } else {
        Res.callFail(res, '关注列表获取失败');
    }
});
router.get('/mp/:userid/profile', (req, res) => {
    let userid = req.params.userid;
    if (userid) {
        let client = DBUtils.connectServer();
        var sql = "select u.*,count(p.postid) postCount FROM `user_info` u LEFT JOIN `user_post` p on p.userid = u.userid where u.userid = ? limit 1;";
        sql = DBUtils.format(sql, [userid]);
        client.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                Res.err(res);
            } else {
                let profile = result[0] || {};
                Res.callSuccess(res, '信息获取成功', profile);
            }
        });
    } else {
        Res.callFail(res, '信息获取失败');
    }
});
module.exports = router;
