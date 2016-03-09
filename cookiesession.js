/**
 * Created by Changchunboeisr@163.com on 2016/3/8 0008.
 */
var redis = require('redis');
function cookiesession(req, res) {
    var self = this; //用变量替换this
    this.SESSIONID; //session_id,在客户端存储在cookie中，在服务器端存用来标识用户信息
    this.expires; // 用户信息在服务器中的过期时间，时间戳

    /*服务器端获取客户端的cookie，返回值：对象*/
    this.getCookie = function() {
        // 没有cookie时返回空对象
       if(req.headers.cookie == undefined) {
           return {};
       }
        // 返回客户端存储的所有cookie
       var arr = req.headers.cookie.split(';');
       var cookie = new Object();
       for(var i = 0, len = arr.length; i < len; i++) {
           var tmpArr = arr[i].split('=');
           cookie[tmpArr[0].trim()] = (tmpArr[1]).trim();
       }
       return cookie;
   };

    /*
    * 设置cookie
    * name和value分别为cookie的键和值
    * option 为对象，是cookie的选项，{
    *      expires:date,  //Expires值是一个UTC格式的时间字符串
    *      path : '/ccb', //cookie的作用路径
    *      domain : 'domain', //cookie的作用域名
    *      httpOnly: ,  //告知浏览器不允许通过document.cookie去更改Cookie值
    *      secure:,  //当Secure值为true时，表示创建的Cookie只能在HTTPS连接中被浏览器传递到服务器端进行验证
    *  }
    * */
    this.setCookie = function(name,value,option) {
       var arr = [name + '=' + value];
       for(var key in option) {
           arr.push(key + '=' + option[key]);
       }
       var cookie = arr.join(';');
       res.setHeader("Set-Cookie", cookie);
   };

    // 创建redis客户端
    var client = new redis.createClient({
        host:'127.0.0.1',
        port:6379
    });

    /*使用62个字符随机拼成一个长度为40的字符串作为session_id*/
    this.createId = function() {
        var chars = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPALKSJDFHGMZNXBCV0142356789';
        self.SESSIONID = '';
        for(var i = 0, len = chars.length; i < 40; i++) {
            var start = Math.floor(Math.random()*len);
            self.SESSIONID += chars.slice(start,start+1);
        }
        client.exists(self.SESSIONID,function(err,reply) {
            if(reply) {
                self.createId();
            }
        });
    };

    /*创建session,把session_id分别存储在客户端和服务器中*/
    this.createSession = function() {
        var date = new Date();
        date.setMinutes(date.getMinutes() + 60); // 设置过期时间
        var expires = 7*24*3600; // 设置服务器中自动删除session信息的时间
        self.createId();
        self.setCookie('SESSIONID',self.SESSIONID,{
            expires : date
        });
        // 设置session信息的有效时间，以便在start检测session信息的有效性
        client.hset(self.SESSIONID,'expires',Date.parse(date),function() {});
        // 设置redis中的session_id的过期时间
        client.expire(self.SESSIONID,expires);
    };

    /*删除session中的单条信息*/
    this.delete = function(key,callback) {
        client.hdel([self.SESSIONID,key],function(err,reply) {
            callback(err, reply);
        });
    };

    /*删除session中的所有数据*/
    this.deleteAll = function(callback) {
        client.hgetall(self.SESSIONID, function(err,reply) {
            if(err) {
                console.log(err);
            }
            for(var key in reply) {
                if(key == 'expires') {
                    continue;
                }
                self.delete(key,callback);
            }
        });
    };

    /*为session添加一条信息*/
    this.set = function(key,val,callback) {
        client.hset(self.SESSIONID,key,val,function(err,reply) {
            callback(err,reply);
        });
    }

    /*完全删除session，包括cookie中的session_id和服务器中所存储的session*/
    this.destroy = function(callback) {
        client.expire(self.SESSIONID,0,function(err,reply) {
            callback(err, reply);
        });
    };

    this.getm = function(key,callback) {
        client.hget(key,'expires',function(err,reply) {
            callback(err,reply);
        });
    };
    /*开启session的入口函数
    * callback为回调函数，会函数可以有一参数，用来存储session
    * */
    this.start = function(callback) {
        var id = self.getCookie()['SESSIONID'];

        // cookie中不存在session_id时，创建session
        if(id == undefined) {
            self.createSession();
            callback(null);
        }else{
            // 若客户端中存在session_id，则在服务器端判断session信息的有效性
            self.SESSIONID = id;
            client.hget(self.SESSIONID,'expires',function(err,reply) {
                self.expires = reply;

                // session信息过期，则删除该session,重新创建
                if(self.expires < Date.parse(Date()) || reply == null) {
                    client.del(self.SESSIONID,function() {
                        self.createSession();
                        callback(null);
                    });
                }else{
                    // session信息有效，返回session中的信息
                    client.hgetall(self.SESSIONID,function(err,reply) {
                        if(err) {
                            console.log("getting session in error");
                        }
                        delete reply['expires'];
                        callback(reply);
                    });
                }
            });
        }
    };
}
module.exports = cookiesession ;