# cookiesession

这是一个异步的cookie和session管理模块，session是基于redis存储于内存当中

// 引用模块

var Cookiesession = require('./cookiesession');

# cookie的使用

// 设置cookie,option为一个对象，属性有expires、path、domain、httpOnly和secure

cookie.setCookie('key','value',option);

// 获取cookie,返回一个对象

cookie.getCookie();

# session的使用

// 创建接口

var session =  new Cookiesession(req,res);

// 初始化接口

session.start(function(sess) {

    
    // sess为session数据
    console.log(sess);

   
    // 删除单个数据           
    session.delete('role',function(err,reply) {
        console.log(reply);
    });

    
    // 设置session
    session.set('name','ccb',function(err,reply) {
        console.log(reply);
    });

  
    // 删除所有数据
    session.deleteAll(function(err,reply) {
        console.log(reply);
    });

   
    // 彻底删除session
    session.destroy(function(err, reply) {
        console.log(reply);
    });
    
});
