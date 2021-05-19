const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const NodeCouchDb = require('node-couchdb');
const { type } = require('os');
const { isAuth, isAdminRoute, blockIfLoggedIn } = require('./middleware/auth');
const jwtAuth = require('jsonwebtoken');
var bcrypt = require('bcryptjs');

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const yaml = require('js-yaml');
const issue= require('./../issue.js');
const cast= require('./../cast.js');
const query= require('./../queryapp.js');

const config = require('./config.json');
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
              if(bcrypt.compareSync(password, dbpassword) && data["rows"][0].value.user_type === "organizer"){
                // if(password == dbpassword){
                const token = jwtAuth.sign({ sub: data.rows[0].value }, config.secret, { expiresIn: '7d' });
                res.cookie('token', token);
                if(data["rows"][0].value.is_admin){
                  //admin route
                  return res.redirect('/');
                } else{
                  //user route
                  return res.redirect('/welcome');
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
index.get("/logout", isAuth, (req,res) =>{
  res.clearCookie("token");
   res.redirect("/");
});
index.get('/', isAuth,isAdminRoute, function(req, res){

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
//User Links
index.get('/addUser', isAuth, isAdminRoute,function(req,res){
    couch.get(dbName,viewUrl).then(function(data,headers,status){
        console.log(data.data.rows);
    res.render('addUser',{
        elections : data.data.rows
            });
        },
        function(err){
            res.send('error');
        });
    });

index.post('/addUser', isAuth, isAdminRoute, async function(req,res){
      console.log(req.body);
      const matriculationnumber=req.body.matriculationnumber;
      const firstname=req.body.firstname;
      const lastname=req.body.lastname;
      const course=req.body.course;
      const semester=req.body.semester;
      const email=req.body.email;
      const branch=req.body.branch;
      const password = `${firstname}-${matriculationnumber}`;

      try{
        const viewUrl = "/_design/all_users/_view/users";
         
        const queryOptions = {
            key:matriculationnumber,
            incude_docs:true
        };
        var {data, headers, status} = await couch.get("users", viewUrl, queryOptions)
        if(data && data.rows && data.rows.length > 0){
          return res.render('addUser',{err_msg:"The Matriculation number already exist"});
        }
      } catch(error){
        console.log(error);
        return res.render('addUser',{err_msg: error.message});
      }

      try {
        // add to wallet start
        // load the network configuration
        let connectionProfile = yaml.safeLoad(fs.readFileSync('../../gateway/connection-org2.yaml', 'utf8'));

        // Create a new CA client for interacting with the CA.
        const caInfo = connectionProfile.certificateAuthorities['ca.org2.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), '../../identity/user/isabella/wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user.
        const userExists = await wallet.get(matriculationnumber);
        if (userExists) {
            console.log(`An identity for the client user ${matriculationnumber} already exists in the wallet`);
            // return;
        } else{
          // Enroll the admin user, and import the new identity into the wallet.
          const enrollment = await ca.enroll({ enrollmentID: "user1", enrollmentSecret: "user1pw" });
          const x509Identity = {
              credentials: {
                  certificate: enrollment.certificate,
                  privateKey: enrollment.key.toBytes(),
              },
              mspId: 'Org2MSP',
              type: 'X.509',
              orgName:'Organiser'
          };
          await wallet.put(matriculationnumber, x509Identity);
          console.log(`Successfully enrolled client user ${matriculationnumber} and imported it into the wallet`);
          // add to wallet end
        }
        // add user detail in couch db
        couch.uniqid().then(function(ids){
              const id = ids[0];

              couch.insert('users', {
                _id: id,
                firstname: firstname,
                lastname: lastname,
                matriculationnumber: matriculationnumber,
                course: course,
                branch: branch,
                semester: semester,
                email: email,
                password: bcrypt.hashSync(password, 10),
                is_admin: false,
                user_type: "organizer"
              })
              .then(
                  function(data, headers, status){
                    couch.insert('election', {
                      _id: id,
                      fname: firstname,
                      lname: lastname,
                      branch: branch,
                      number: matriculationnumber,
                      course: course,
                      type: "student"
                    })
                    .then(
                        function(data, headers, status){
                          return res.render('addUser',{err_msg:"User added successfully"});
                     },
                     function(err){
                      console.log(err);
                        return res.render('addUser',{err_msg:err.message});
                      }
                    );
               },
               function(err){
                console.log(err);
                  return res.render('addUser',{err_msg:err.message});
                }
              );
            });

    } catch (error) {
        console.error(`Failed to enroll client user ${matriculationnumber}: ${error}`);
        res.render('addUser', {err_msg: error.message})
    }
      
     
});
index.post("/user/delete/:id/:matriculationnumber", isAuth, isAdminRoute,function(req,res){
    const id = req.params.id;
    const rev=req.body.rev;
    const matriculationnumber=req.params.matriculationnumber;
    const walletPath = `../../identity/user/isabella/wallet/${matriculationnumber}.id`;
    console.log("id", id)
    console.log("rev", rev)  
    console.log("matriculationnumber", matriculationnumber)  
    couch.del("users", id, rev).then(
        function(data, headers, status){
          couch.get(dbName,id).then(function(data,headers,status){
            if(data && data.data && data.data._rev){
              couch.del(dbName, id, data.data._rev).then(
                function(data, headers, status){
                  if (fs.existsSync(walletPath)) {
                    console.log("File exists.", walletPath)
                    fs.unlinkSync(walletPath)
                  }
                  return res.redirect("/user")
                },
                function(err){
                    res.send(err);
                }); 
            }
            },
            function(err){
                res.send(err);
            });        
        },
        function(err){
          console.log("error",)
            res.send(err);
        }
    );
});
index.get('/user', isAuth, isAdminRoute,function(req,res){
  const userView = "/_design/all_users/_view/users";
  couch.get("users",userView).then(function(data,headers,status){
      let datas = data.data.rows.filter(val => val.value.is_admin!= true);
  res.render('user',{
      users : datas
          });
      },
      function(err){
          res.send('error');
      });
});

index.get('/profile', isAuth,async function(req,res){
  try{
    let response =  await couch.get("users",res.locals.tokenData.id);
    console.log("response", response.data)
    res.render('profile',{
        data : response.data
    });
  } catch(err){
    console.log("error=======", err)
    return res.send(err);
  }
});

index.post('/profile/:id', isAuth,async function(req,res){
  let id = req.params.id;
  let rev = req.body.rev;
  const matriculationnumber=req.body.oldMatriculationNumber;
  const firstname=req.body.firstname;
  const lastname=req.body.lastname;
  const course=req.body.course;
  const semester=req.body.semester;
  const email=req.body.email;
  const branch=req.body.branch;
  const password = req.body.password || '';
  const oldPassword = req.body.oldPassword;
  console.log("password", password)
  let electionRev = '';

  // get _rev from election
  try{
    let electionResp =  await couch.get(dbName,id);
    electionRev = electionResp.data._rev;
  } catch(err){
    console.log("error=======", err)
    return res.send(err);
  }
  console.log("electionRev", electionRev)

  let dataToUpdate = {
      _id: id,
      _rev:rev,
      firstname: firstname,
      lastname: lastname,
      matriculationnumber: matriculationnumber,
      course: course,
      branch: branch,
      semester: semester,
      email: email,
      password: (password) ? bcrypt.hashSync(password, 10) : oldPassword,
      is_admin: false,
      user_type: "organizer"
    }
    // console.log("before is")
    // if(password){
    //   console.log("if=====")
    //   dataToUpdate["password"] = bcrypt.hashSync(password, 10);
    // }

    console.log("dataToUpdate", dataToUpdate)
   couch.update("users",dataToUpdate).then(
        function(data, headers, status){
          couch.update(dbName,{
            _id: id,
            _rev: electionRev,
            fname: firstname,
            lname: lastname,
            number: matriculationnumber,
            branch: branch,            
            course: course,
            type: "student"
          }).then(
              function(data, headers, status){
                  res.redirect('/profile');
              },
              function(err){
                  res.send(err);
              }
          );        },
        function(err){
            res.send(err);
        }
    );
});

index.get('/welcome',isAuth, function(req,res){
    couch.get(dbName,viewUrl).then(function(data,headers,status){
        var todayDate = new Date().toISOString().slice(0, 10);
        console.log(todayDate);
        let datas = data.data.rows.filter(val => val.value.type == "election" && val.value.election_date == todayDate);

    res.render('welcome',{
        elections : datas
            });
        },
        function(err){
            res.send('error');
        });
    });
index.get('/cast', isAuth,function(req,res){ 
  
   couch.get(dbName, viewUrl).then(  
  function(data, headers, status){  
    // console.log("data.data.rows", data).data
    // let datas = data.data.rows.filter(val => val.value.type == "election");
    // console.log(datas);  
    res.render('cast',{  
    elections:data.data.rows,
    query:req.query,
    voter:res.locals.tokenData.matriculationnumber

    });  
    },  
    function(err){  
    res.send(err);  
    });  
}); 

index.get('/show_all',isAuth,function(req, res){

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

index.get('/add',isAuth,function(req,res){
    couch.get(dbName,viewUrl).then(function(data,headers,status){
        console.log(data.data.rows);
    res.render('addElection',{
        elections : data.data.rows
            });
        },
        function(err){
            res.send('error');
        });
    });


index.get('/update',isAuth,function(req,res){
    couch.get(dbName,viewUrl).then(function(data,headers,status){
        console.log(data.data.rows);
    res.render('updateElection',{
        elections : data.data.rows
            });
        },
        function(err){
            res.send('error');
        });
    });

 
index.get('/delete',isAuth,function(req,res){
    couch.get(dbName,viewUrl).then(function(data,headers,status){
        console.log(data.data.rows);
         res.render('deleteElection',{
     elections : data.data.rows
         });
     },
     function(err){
         res.send('error');
     });
  
});
    index.get('/try',function(req,res){
        couch.get(dbName,viewUrl).then(function(data,headers,status){
            console.log(data.data.rows);
        res.render('try',{
            elections : data.data.rows
            
                });
            },
            function(err){
                res.send('error');
            });
        });
    
      
        index.get('/result',isAuth,function(req,res){
            couch.get(dbName,viewUrl).then(function(data,headers,status){
                console.log(data.data.rows);
                console.log("==============here",res.locals.tokenData.matriculationnumber);
            res.render('result',{
                elections : data.data.rows,
                issuing:issue,
                query:req.query,
                voter:res.locals.tokenData.matriculationnumber
                    });
                },
                function(err){
                    res.send('error');
                });
            });

            index.get('/castForm',isAuth,function(req,res){
                couch.get(dbName,viewUrl).then(function(data,headers,status){
                    console.log(data.data.rows);
                res.render('castForm',{
                    elections : data.data.rows,
                    query:req.query,
                  
                    voter:res.locals.tokenData.matriculationnumber
                });
                    },
                    function(err){
                        res.send('error');
                    });
                });
    
    index.get('/casting',isAuth,function(req,res){
        couch.get(dbName,viewUrl).then(function(data,headers,status){
            console.log(data.data.rows);
        res.render('castSmCt',{
            elections : data.data.rows,
            query:req.query,
            casting:cast,
            voter:res.locals.tokenData.matriculationnumber

                });
            },
            function(err){
                res.send('error');
            });
        });
  //Election Put Statements  
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

index.post('/result/:id',function(req,res){
    const id= req.params.id;
    const rev=req.body.rev;
    const type=req.body.type;
    const ballot=req.body.ballot;
    const name = req.body.name;
    const voterlist=req.body.voterlist;
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
        res.redirect('/cast/?id='+req.params.id+'&bt='+req.body.ballot);
    },
    function(err){
        res.send('error');
    }
);
});

index.post('/cast/:id',function(req,res){
    const id= req.params.id;
    const rev=req.body.rev;
    const type=req.body.type;
    const ballot=req.body.ballot;
    const voterlist=req.body.voterlist;
    const selCand=req.body.selCand;
    const btNnum = req.body.btNum;
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
        res.redirect('/casting/?id='+req.params.id+'&bt='+req.body.btNum+'&sel='+req.body.selCand);
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

index.listen(3000,function(){
console.log('server started on port 3000');
});
