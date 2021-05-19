const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const NodeCouchDb = require('node-couchdb');
const { type } = require('os');
const { isAuth, isAdminRoute, blockIfLoggedIn } = require('./middleware/auth');
const jwtAuth = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
const yaml = require('js-yaml');
const config = require('./config.json');
const url = require('url');
const querystring = require('querystring');
const query= require('./../queryapp');
const query_audit= require('./../queryaudit');
const audit= require('./../audit');

const couch = new NodeCouchDb({
    auth:{
        user:'admin',
        password:'adminpw'
    }
});


const dbName = 'election';
const viewUrl = '_design/all_elections/_view/all';

couch.listDatabases().then(function(dbs) {
    console.log(dbs);
});
const index = express();
index.set('view engine','ejs');
index.set('views',path.join(__dirname,'views'));
index.use(bodyParser.json());
index.use(bodyParser.urlencoded({extended:false}));

index.use("/public", express.static('public'))
index.get('/login',blockIfLoggedIn, function(req, res){
    res.render('login');
});

index.post("/login", async(req,res) =>{
    try{
        //fetch credential from UI
       const matriculationnumber = req.body.matriculationnumber;
       const password = req.body.password;
 
       const dbName = "users";
       //const endKey = ["George"];
       const viewUrl = "/_design/all_users/_view/users";
        
       const queryOptions = {
           key:matriculationnumber,
           incude_docs:true
       };
        try{
 
           var {data, headers, status} = await couch.get(dbName, viewUrl, queryOptions);
           console.log("couch dta", data)
           if (data.rows && data.rows.length>0){ 
             console.log("data", data["rows"])
                const dbpassword= data["rows"][0].value.password
               if(bcrypt.compareSync(password, dbpassword) && data["rows"][0].value.user_type === "verifier"){
                 // if(password == dbpassword){
                 const token = jwtAuth.sign({ sub: data.rows[0].value }, config.secret, { expiresIn: '7d' });
                 res.cookie('verifierToken', token);
                 if(data["rows"][0].value.is_admin){
                   return res.redirect('/verifier');
                 } else{
                   return res.redirect('/verifier');
                 }
                      // return res.status(200).send({token, message:"logged in successfully"})
                }else{ 
                 return res.render('login',{err_msg: "Invalid login details"})
                }
           }else {
               return res.render('login',{err_msg: "Invalid login details"})
           }
         } catch(error){
           console.log(error);
           return res.render('login',{err_msg: error.message})
         }
       
    } catch(error){
       console.log("error", error)
       return res.render('login',{err_msg: error.message})
    }
 });

/*index.post("/login",blockIfLoggedIn, async(req,res) =>{
   try{

      const matriculationnumber = req.body.matriculationnumber;
      const password = req.body.password;

      const dbName = "users";
      //const endKey = ["George"];
      const viewUrl = "/_design/all_users/_view/users";
       
      const queryOptions = {
          key:matriculationnumber,
          incude_docs:true
      };
       try{

          var {data, headers, status} = await couch.get(dbName, viewUrl, queryOptions);
          console.log("couch dta", data)
          if (data.rows && data.rows.length>0){ 
            console.log("data", data["rows"])
               const dbpassword= data["rows"][0].value.password
              if(bcrypt.compareSync(password, dbpassword) && data["rows"][0].value.user_type === "verifier"){
                // if(password == dbpassword){
                const token = jwtAuth.sign({ sub: data.rows[0].value }, config.secret, { expiresIn: '7d' });
                res.cookie('verifierToken', token);
                return res.redirect('/verifier');
                     // return res.status(200).send({token, message:"logged in successfully"})
               }
              else{ 
                return res.render('login',{err_msg: "Invalid login details"})
               }
          }else {
              return res.render('login',{err_msg: "Invalid login details"})
          }
        } catch(error){
          console.log(error);
          return res.render('login',{err_msg: error.message})
        }
      
   } catch(error){
      console.log("error", error)
      return res.render('login',{err_msg: error.message})
   }
});*/
index.get("/logout", isAuth, (req,res) =>{
  console.log("logout called")
  res.clearCookie("verifierToken");
   res.redirect("/login");
});
index.get('/verifier',isAuth,isAdminRoute, function(req, res){

    couch.get(dbName,viewUrl).then(function(data,headers,status){
       console.log(data.data.rows);
        res.render('auditElection',{
    elections : data.data.rows,
    trying:query_audit,
    voter:res.locals.tokenData.matriculationnumber
        });
    },
    function(err){
        res.send('error');
    });
});

index.get('/verifier'/*,isAuth*/,function(req,res){
    couch.get(dbName,viewUrl).then(function(data,headers,status){
        console.log(data.data.rows);
        console.log(query_audit.data);
    res.render('auditElection',{
        elections : data.data.rows,
        trying:query_audit,
        //voter:res.locals.tokenData.matriculationnumber
            });
        },
        function(err){
            res.send('error');
        });
    });
        index.get('/results',/*isAuth,*/function(req, res){

            couch.get(dbName,viewUrl).then(function(data,headers,status){
              var todayDate = new Date().toISOString().slice(0, 10);
              console.log(todayDate);
              let datas = data.data.rows.filter(val => val.value.type == "election");
              console.log("election datas", datas);
                res.render('resElection',{
            elections : datas,
            utils:query
                });
            },
            function(err){
                res.send('error');
            });
            });



    index.get('/confirmAudit'/*,isAuth*/,function(req,res){
        couch.get(dbName,viewUrl).then(function(data,headers,status){
            console.log(data.data.rows);
        res.render('confirmAudit',{
            elections : data.data.rows,
            trying:query_audit,
            auditing:audit,
          //  voter:res.locals.tokenData.matriculationnumber

                });
            },
            function(err){
                res.send('error');
            });
        });


index.get('/result',function(req,res){
    couch.get(dbName,viewUrl).then(function(data,headers,status){
        // console.log(data.data.rows);
        console.log("query123", query);
    res.render('result',{
        elections : data.data.rows,
        utils:query,
        query:req.query,
        

            });
        },
        function(err){
            res.send('error');
        });
    });
    index.get('/',isAuth,function(req, res){

        couch.get(dbName,viewUrl).then(function(data,headers,status){
           console.log(data.data.rows);
            res.render('index',{
        elections : data.data.rows
            });
        },
        function(err){
            res.send('error');
        });
        });

    index.post('/election/add',function(req, res){
        const name = req.body.name;
       const date = req.body.date;
       const type= req.body.type;
       const ballot = req.body.ballot;
       const voterlist=req.body.voterlist;
       const candidate_1={
           user_name:req.body.user1,
           party:req.body.partyname1,
           branch:req.body.branchname1
    }
    const candidate_2={
        user_name:req.body.user2,
        party:req.body.partyname2,
        branch:req.body.branchname2
    }
    const candidate_3={
        user_name:req.body.user3,
        party:req.body.partyname3,
        branch:req.body.branchname3
    }
       
       couch.uniqid().then(function(ids){
    const id = ids[0];
    
    couch.insert(dbName, {
        _id: id,
        type:type,
        ballot:ballot,
        election_name:name,
        election_date:date,
        voterlist:voterlist,
        candidate_1:candidate_1, 
        candidate_2:candidate_2,
        candidate_3:candidate_3
    }).then(function(data,headers,status){
        res.redirect('/');
    },
    function(err){
        res.send(err);
     
    });
    });
        
    });
    index.post("/election/delete/:id",function(req,res){
        const id = req.params.id;
        const rev=req.body.rev;
        couch.del(dbName, id, rev).then(
            function(data, headers, status){
                res.redirect('/');
            },
            function(err){
                res.send('error');
            }
        );
    });
    

    index.post('/election/update/:id',function(req,res){
        const id= req.params.id;
        const rev=req.body.rev;
        const type=req.body.type;
        const ballot=req.body.ballot;
        const voterlist=req.body.voterlist;
        const name = req.body.name;
           const date = req.body.date;
           const candidate_1={
            user_name:req.body.user1,
            party:req.body.partyname1,
            branch:req.body.branchname1
        }
        const candidate_2={
         user_name:req.body.user2,
         party:req.body.partyname2,
         branch:req.body.branchname2
        }
        const candidate_3={
         user_name:req.body.user3,
         party:req.body.partyname3,
         branch:req.body.branchname3
        }
        couch.update(dbName,{
            _id: id,
            _rev:rev,
            election_name:name,
            election_date:date,
            type:type,
            ballot:ballot,
            voterlist:voterlist,
            candidate_1:candidate_1, 
            candidate_2:candidate_2,
            candidate_3:candidate_3
        }).then(
            function(data, headers, status){
                res.redirect('/');
            },
            function(err){
                res.send('error');
            }
        );
        });
index.listen(8080,function(){
console.log('server started on port 8080');
});
