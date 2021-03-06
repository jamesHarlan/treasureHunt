var mysql = require('mysql');
var bcrypt = require('bcrypt');

var pool = mysql.createPool({
  connectionLimit: 10,
  user: 'root',
  password: '',
  database: 'gooseEggs'
});


module.exports = {

  createGame: function(params, cb) {
      var gameTable = "INSERT INTO gameInfo(gameName, description, createdDate, createdBy, private, avgRating, numOfRatings) VALUES(?,?,?,?,?,0,0)";
      var today = Date.now();
      console.log('today type');
      console.log(typeof today);
      console.log('today: ', today)
      pool.getConnection(function(err, connection){
        connection.query(gameTable, [params.gameName, params.description, today, params.userName, params.private], function(err, results){        
          if(err){
            console.error('[MYSQL]createGame error: ',err);
          }
          else{
            // console.log('results ',results);
            gameId = results.insertId
            cb(gameId);
          }
          connection.release();
        });
      });
      // var createdDate = today.getMonth()  +1 + "/"+ today.getDate() + "/"+ today.getFullYear();
  },
  createNodeInfo: function(params){
    var insertStr = "INSERT INTO nodeInfo(lon, lat, image, clue, nodeId, gameId) VALUES(?,?,?,?,?,?)";
    var selectStr ="SELECT nodeId FROM nodeInfo WHERE gameId=(?) ORDER BY nodeId DESC LIMIT 1";
    var nodeId = 1;
    console.log('longitude: ', params.longitude);
    console.log('latitude: ', params.latitude);
    // console.log('createTreasureInfo params',params);
    pool.getConnection(function(err, connection){
      connection.query(selectStr, [params.gameId], function(err, results){
        if(err){
          console.error('[MYSQL]createNodeInfo select error: ',err);
        }
        else{
          // console.log('SELECT results',results)
          if(results[0]){
            nodeId = results[0].nodeId+1;
          }
          // console.log('this should be clue ',params.clue);
          connection.query(insertStr, [params.longitude, params.latitude, params.imgKey, params.clue, nodeId, params.gameId],
            function(err, results){
              if(err){
                console.error('[MYSQL]createNodeInfo insert error: ',err);
              }
              else{
                // console.log(results);
              }
              connection.release();
            });
        }
      });
    });
  },

  checkUserName: function(params, cb){
    var selectStr = "SELECT * FROM userInfo WHERE userName=(?)";
    pool.getConnection(function(err, connection){

      connection.query(selectStr, params.userName, function(err, results){
        if(err){
          console.error('[MYSQL]checkUserName error: ', err);
          cb({error:'check user name error'});
        }else if(results.length){
          cb({userName: params.userName, auth : true});
        }else{
          cb({error: 'user does not exist'});
        }
        connection.release();
      });
    });
  },

  userRegister: function(params, cb) {
    var insertStr = "INSERT INTO userInfo(userName, password, macadamia) VALUES(?,?,0)";

    bcrypt.genSalt(params.userName.length , function(err, salt){
      bcrypt.hash(params.password, salt, function(err, hash){
        pool.getConnection(function(err, connection){

          connection.query(insertStr, [params.userName, hash], function(err, results){
            if(err){
              console.error("[MYSQL]userRegister error ",err);
              cb({error : "username already exist"});
            }else{
              cb({userName : params.userName});
            }
            connection.release();
          });
        });
      });
    });    
  },

  userSignIn: function(params, cb){
    var selectStr = "SELECT password FROM userInfo where userName = (?)";
    pool.getConnection(function(err, connection){ 
      connection.query(selectStr, [params.userName], function(err, results){
        if(err){
          console.error('[MYSQL]userSignIn error ',err);
        }else if(results.length){
          bcrypt.compare(params.password, results[0].password, function(err,res){
            console.log(res)
            if(res){
              cb({userName: params.userName});
            }else{
              cb({error: 'wrong password/username'});
            }
          });
          // console.log(results[0].password);
        }else{
          cb({error: 'user does not exist'});
        }
        connection.release();
      });
    });
  },
  postNodeInfo: function(params, cb){
    var selectStr = "SELECT gameId, nodeId, \
    image, lat, lon, clue \
    FROM nodeInfo WHERE gameId=(?)";
    pool.getConnection(function(err, connection){    
      connection.query(selectStr, params, function(err, results){
        if(err){
          console.error('[MYSQL]postNodeInfo error: ',err);
        }
        else{
          cb(results);
          // console.log('postNodeInfo', results);
        }
        connection.release();
      });
    });
  },
  //list all games

  //retrieve the only the first image 
  showGames: function(cb, params){
    var queryStr = "SELECT DISTINCT \
        g.gameName, \
        g.gameId, \
        g.description, \
        g.createdDate, \
        g.createdBy, \
        c.nodeCount, \
        i.image, \
        i.lat, i.lon, \
        g.avgRating, \
        g.numOfRatings \
        FROM gameInfo AS g \
        JOIN nodeInfo AS n \
        ON n.gameId = g.gameId \
        JOIN ( \
          SELECT gameId, \
          COUNT(nodeId) AS nodeCount \
          FROM nodeInfo GROUP BY gameId ) AS c \
        ON c.gameId = n.gameId \
        JOIN ( \
          SELECT gameId, lat, lon, \
          image, MIN(nodeId) AS nodeId \
          FROM nodeInfo GROUP BY gameId ) AS i \
        ON i.gameId = n.gameId";
    console.log(params);
    if(params.userName){
      var user = params.userName;
      queryStr = queryStr + ' WHERE g.createdBy="' + user + '"';
      if(params.userName!==params.creator){
        queryStr = queryStr + ' AND g.private = 0';
      }
    }
    else if(params.creator){
      var user = params.creator;
      queryStr = queryStr + ' WHERE g.createdBy="' + user + '"';
      // console.log(queryStr);
    }
    else{
      queryStr = queryStr + ' WHERE g.private = 0';
    }
    pool.getConnection(function(err, connection){     
      connection.query(queryStr, function(err, results){
        if(err){
          console.error('[MYSQL]showGames error: ',err);
        }
        else{
          // console.log(results);
          cb(results);
        }
        connection.release();
      }); 
    });
  },

  getGameInfo : function(id, cb){
    console.log(id);
    var selectStr = "SELECT DISTINCT \
      g.gameName, g.description, g.createdDate, \
      n.nodeId, n.lat, n.lon, n.image, n.clue \
      FROM nodeInfo AS n \
      JOIN gameInfo AS g \
      ON g.gameId = n.gameId \
      WHERE g.gameId = (?)";
    pool.getConnection(function(err, connection){
      connection.query(selectStr, id, function(err, results){
        if(err){
          console.error('[MYSQL]getGameInfo error: ',err);
        }
        cb(err, results);
        connection.release();
      });
    });
  },

  getGameIntro: function(id, cb){
    var selectStr = "SELECT DISTINCT \
        g.gameName, \
        n.gameId, \
        g.description, \
        g.createdBy, \
        g.createdDate, \
        c.nodeCount, \
        i.image, \
        g.avgRating, \
        g.numOfRatings \
        FROM gameInfo AS g \
        JOIN nodeInfo AS n \
        ON n.gameId = g.gameId \
        JOIN ( \
          SELECT gameId, \
          COUNT(nodeId) AS nodeCount \
          FROM nodeInfo GROUP BY gameId ) AS c \
        ON c.gameId = n.gameId \
        JOIN ( \
          SELECT gameId, \
          image, MIN(nodeId) AS nodeId \
          FROM nodeInfo GROUP BY gameId ) AS i \
        ON i.gameId = n.gameId \
        WHERE n.gameId = (?)";
    pool.getConnection(function(err, connection){
      connection.query(selectStr, id, function(err, results){
        if(err){
          console.error('[MYSQL]getGameIntro error: ',err);
        }
        else{
          cb(results);
        }
        connection.release();
      });
    });
  },
  sendScore: function(params, cb){
    var updateStr = "UPDATE gameInfo SET avgRating=(?), \
                    numOfRatings=(?) WHERE gameId=(?)";
    var selectStr = "SELECT avgRating, numOfRatings \
                    FROM gameInfo WHERE gameId=(?)";
    pool.getConnection(function(err, connection){
      connection.query(selectStr, params.gameId, function(err, results){
        if(err){
          console.error('[MYSQL]sendScore',err);
        }
        else{
          var avgRating = results[0].avgRating;
          var numOfRatings = results[0].numOfRatings;
          var avg = ((avgRating * numOfRatings) + params.score) / (numOfRatings + 1);
          console.log('avg', avg);
          connection.query(updateStr, [avg, (numOfRatings+1), params.gameId], function(err, results){
            if(err){
              console.error('[MySQL]updateAvg',err);
            }
            else{
              cb({avg: avg});
            }
          });
        }
        connection.release();
      });
    });
  },

  updateGame: function(params, cb){
    var deleteStr = "DELETE FROM nodeInfo WHERE gameId = (?)";
    var insertStr = "INSERT INTO nodeInfo (lon, lat, image, clue, nodeId, gameId) VALUES";
    var gameId = params.gameId;
    var nodes = params.nodes;
    pool.getConnection(function(err, connection){ 
      connection.query(deleteStr, gameId, function(err, results){
        if(err){
          console.error('[MYSQL]updateGame delete error: ', err);
          cb({error : err});
        }
        else{
          var insertArray = [];
          for(var i = 0;i<nodes.length;i++){
            insertStr = insertStr + ' (?,?,?,?,?,?),'
            insertArray.push([nodes[i]['lon'], nodes[i]['lat'], nodes[i]['image'], nodes[i]['clue'], i+1, gameId]);
          }
          insertStr = insertStr.slice(0, -1);
          insertArray = [].concat.apply([], insertArray);
          console.log('array',insertArray);
          console.log('string', insertStr);

          connection.query(insertStr, insertArray, function(err, results){
            if(err){
              console.error('[MYSQL]updateGame insert error: ', err);
              cb({error : err});
            }else{
              console.log(results);
              cb('update done!');
            }
          });
        }
        connection.release();
      });
    });
  },

  postNodePic: function(params){
    var insertStr = 'INSERT INTO nodePics (gameId, nodeId, image, comment, uploadedTime, userName) VALUES(?,?,?,?,?,?)';
    pool.getConnection(function(err, connection){      
      connection.query(insertStr, [params.gameId, params.nodeId, params.image, params.comment, params.time, params.userName], 
        function(err, results){
          if(err){
            console.error('[MySQL]postNodePic error: ', err);
          }else{
            console.log(results);
          }
          connection.release();
      });
    });
  },

  getNodePics: function(params, cb){
    var selectStr = "SELECT * FROM nodePics WHERE gameId = (?) and nodeId = (?)";
    pool.getConnection(function(err, connection){
      connection.query(selectStr, [params.gameId, params.nodeId], function(err, results){
        if(err){
          console.error('[MYSQL]getNodePics error: ', err);
          cb({error : err});
        }else{
          cb(results);
        }
        connection.release();
      });
    });
  },

  getLeads: function(params, cb){
    var leadSelect = "SELECT userName, macadamia FROM userInfo ORDER BY macadamia DESC";
    pool.getConnection(function(err, connection){  
      connection.query(leadSelect, function(err, results){
        if(err){
          console.error('[MYSQL]select leader error: ', err);
          cb({error : err});
        }else{
          cb(results);
        }
        connection.release();
      });
    });
  },

  macadamia: function(params, cb){
    var insertMacadamia = "INSERT INTO MACADAMIA (userName, gameId, nodeId) VALUES (?,?,?)";
    var checkCreatorStr = "SELECT createdBy FROM gameInfo WHERE gameId=(?)";
    var updateScore = "UPDATE userInfo SET macadamia=macadamia+(?) WHERE userName = (?)";
    var checkMacadamia = "SELECT * FROM MACADAMIA WHERE userName=(?) AND gameId=(?) AND nodeId=(?)";
    pool.getConnection(function(err, connection){
      if(params.macadamia<0){
        connection.query(updateScore, [params.macadamia, params.userName], function(err, results){
          if(err){
            console.error('[MYSQL]macadamia minus point error: ', err);
            cb({error:'error subtracting points'});
          }
        });
      }else{
        connection.query(checkCreatorStr, params.gameId, function(err, results){
          if(err){
            console.log('gameid',params.gameId);
            console.error('[MYSQL]macadamia checkCreator error: ', err);
            cb({error:'check game creator error'});
          }else if(results[0]['createdBy'] !== params.userName){
            connection.query(checkMacadamia, [params.userName, params.gameId, params.nodeId], function(err, results){
              if(err){
                console.error('[MYSQL]checkPoints error: ', err);
                cb({error:'error checking points'});
              }else{
                  console.log('check results should be empty',results);
                if(results.length<1){
                  connection.query(updateScore, [params.macadamia, params.userName], function(err, results){
                    if(err){
                      console.error('[MYSQL]updateScore error: ', err);
                    }else{
                      connection.query(insertMacadamia, [params.userName, params.gameId, params.nodeId], function(err, results) {
                        if(err){
                          console.error('[MYSQL]insertMacadamia error: ', err);
                          cb({error:'insertMacadamia error'});
                        }else{
                          console.log('results after adding to score: ',results);
                          cb(results);
                        }
                      });
                    }
                  });
                }else{
                  cb({error:'already got a point'});
                }
              }
            });
          }else{
            console.log('creator playing');
            cb({error:'creator playing game, cannot give points'});
          }
        });
      }
      connection.release();
    });
  },

  creatorsData: function(cb){
    var queryStr = "SELECT userName, macadamia FROM userInfo WHERE userName in (?,?,?,?)";
    pool.getConnection(function(err, connection){
      connection.query(queryStr, ["cindy","jim","thomas","zhao"], function(err, results){
        if(err){
            console.error('[MYSQL]createData: ', err);
            cb({error:'creatorData error'});
        }
        else{
          cb(results);
        }
        connection.release();
      });
    });
  }
};
