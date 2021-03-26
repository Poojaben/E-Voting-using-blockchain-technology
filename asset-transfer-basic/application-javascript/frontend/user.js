const { isAuth,blockIfLoggedIn  } = require ('./middleware/auth.js')
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const NodeCouchDb = require('node-couchdb');
const config = require('./config.json');
const jwtAuth = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
const { check, validationResult } 
    = require('express-validator'); 
  
const couch = new NodeCouchDb({
	auth:{
		user:'admin',
		password:'adminpw'
	}
});
const dbName = 'users';
const viewUrl = '_design/all_users/_view/all';

couch.listDatabases().then(function(dbs){
	console.log('dbs',dbs);
});

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use("/public", express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get("/users/add", isAuth, function (req, res) { 
    res.render("index"); 
});


app.post('/users/add', isAuth, [ 
    check('email', 'Email length should be 10 to 30 characters') 
                    .isEmail().isLength({ min: 10, max: 30 })
     ], async function(req,res){
      console.log(req.body);
  	const matriculationnumber=req.body.matriculationnumber;
     try{
        // validationResult function checks whether 
        // any occurs or not and return an object 
        const errors = validationResult(req); 
      
        // If some error occurs, then this 
        // block of code will run 
        if (!errors.isEmpty()) { 
            return res.json(errors) 
        }
        //const endKey = ["George"];
        const viewUrl = "/_design/matriculation/_view/number";
         
        const queryOptions = {
            key:matriculationnumber,
            incude_docs:true
        };
        var {data, headers, status} = await couch.get("authorized_matriculation", viewUrl, queryOptions)
        if(!data || (data && !data.rows) || ( data && data.rows && data.rows.length < 1)){
          return res.render('index',{err_msg:"Please Enter Valid Matriculation Number"});
        }
      } catch(error){
        console.log(error);
        return res.render('index',{err_msg: error.message});
      }

      try{
        const viewUrl = "/_design/all_users/_view/all";
         
        const queryOptions = {
            key:matriculationnumber,
            incude_docs:true
        };
        var {data, headers, status} = await couch.get("users", viewUrl, queryOptions)
        if(data && data.rows && data.rows.length > 0){
          return res.render('index',{err_msg:"The Matriculation number already exist"});
        }
      } catch(error){
        console.log(error);
        return res.render('index',{err_msg: error.message});
      }
      
  	const firstname=req.body.firstname;
  	const lastname=req.body.lastname;
  	const course=req.body.course;
  	const semester=req.body.semester;
  	const email=req.body.email;
  	const password=req.body.password;

    const { Gateway, Wallets } = require('fabric-network');
    const FabricCAServices = require('fabric-ca-client');
    const path = require('path');
    const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../../test-application/javascript/CAUtil.js');
    const { buildCCPOrg1, buildWallet } = require('../../../test-application/javascript/AppUtil.js');


    const channelName = 'mychannel';
    const chaincodeName = 'basic';
    const mspOrg1 = 'Org1MSP';
    const walletPath = path.join(__dirname, 'wallet');
     try {
        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp = buildCCPOrg1();

        // build an instance of the fabric ca services client based on
        // the information in the network configuration
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(Wallets, walletPath);

        // in a real application this would be done on an administrative flow, and only once
       // await enrollAdmin(caClient, wallet, mspOrg1);

        // in a real application this would be done only when a new user was required to be added
        // and would be part of an administrative flow
        await registerAndEnrollUser(caClient, wallet, mspOrg1, matriculationnumber, 'org1.department1');

        // Create a new gateway instance for interacting with the fabric network.
        // In a real application this would be done as the backend server session is setup for
        // a user that has been verified.
        const gateway = new Gateway();

        try {
           // setup the gateway instance
           // The user will now be able to create connections to the fabric network and be able to
           // submit transactions and query. All transactions submitted by this gateway will be
           // signed by this user using the credentials stored in the wallet.
           await gateway.connect(ccp, {
              wallet,
              identity: matriculationnumber,
              discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
           });

           // Build a network instance based on the channel where the smart contract is deployed
           const network = await gateway.getNetwork(channelName);

           // Get the contract from the network.
           const contract = network.getContract(chaincodeName);

           // Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
           // This type of transaction would only be run once by an application the first time it was started after it
           // deployed the first time. Any updates to the chaincode deployed later would likely not need to run
           // an "init" type function.
           console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
           await contract.submitTransaction('InitLedger');
           console.log('*** Result: committed');

           // Let's try a query type operation (function).
           // This will be sent to just one peer and the results will be shown.
           console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
           let result = await contract.evaluateTransaction('GetAllAssets');
           console.log(`*** Result: ${JSON.stringify(result.toString())}`);

           // Now let's try to submit a transaction.
           // This will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
           // to the orderer to be committed by each of the peer's to the channel ledger.
           console.log('\n--> Submit Transaction: CreateAsset, creates new asset with ID, color, owner, size, and appraisedValue arguments');
           result = await contract.submitTransaction('CreateAsset', 'asset13', 'yellow', '5', 'Tom', '1300');
           console.log('*** Result: committed');
           if (`${result}` !== '') {
              console.log(`*** Result: ${JSON.stringify(result.toString())}`);
           }

           console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
           result = await contract.evaluateTransaction('ReadAsset', 'asset13');
           console.log(`*** Result: ${JSON.stringify(result.toString())}`);

           console.log('\n--> Evaluate Transaction: AssetExists, function returns "true" if an asset with given assetID exist');
           result = await contract.evaluateTransaction('AssetExists', 'asset1');
           console.log(`*** Result: ${JSON.stringify(result.toString())}`);

           console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
           await contract.submitTransaction('UpdateAsset', 'asset1', 'blue', '5', 'Tomoko', '350');
           console.log('*** Result: committed');

           console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
           result = await contract.evaluateTransaction('ReadAsset', 'asset1');
           console.log(`*** Result: ${JSON.stringify(result.toString())}`);

           try {
              // How about we try a transactions where the executing chaincode throws an error
              // Notice how the submitTransaction will throw an error containing the error thrown by the chaincode
              console.log('\n--> Submit Transaction: UpdateAsset asset70, asset70 does not exist and should return an error');
              await contract.submitTransaction('UpdateAsset', 'asset70', 'blue', '5', 'Tomoko', '300');
              console.log('******** FAILED to return an error');
           } catch (error) {
              console.log(`*** Successfully caught the error: \n    ${error}`);
           }

           console.log('\n--> Submit Transaction: TransferAsset asset1, transfer to new owner of Tom');
           await contract.submitTransaction('TransferAsset', 'asset1', 'Tom');
           console.log('*** Result: committed');

           console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
           result = await contract.evaluateTransaction('ReadAsset', 'asset1');
           console.log(`*** Result: ${JSON.stringify(result.toString())}`);
        } finally {
           // Disconnect from the gateway when the application is closing
           // This will close all connections to the network
            gateway.disconnect();
            couch.uniqid().then(function(ids){
              const id = ids[0];

              couch.insert('users', {
                id: id,
                firstname: firstname,
                lastname: lastname,
                matriculationnumber: matriculationnumber,
                course: course,
                semester: semester,
                email: email,
                password: bcrypt.hashSync(password, 10),
                is_admin: false
              })
              .then(
                  function(data, headers, status){
                    return res.redirect('/');
               },
               function(err){
                  return res.send(err);
                }
              );
            });
        }
     } catch (error) {
        console.error(`******** FAILED to run the application: ${error}`)
        return{
                          status:500,
                          error
                                 }
     }
});

app.get("/", blockIfLoggedIn,  (req,res) =>{
   res.render("login");
});

// { }
app.post("/", async(req,res) =>{
   try{

      const matriculationnumber = req.body.matriculationnumber;
      const password = req.body.password;

      const dbName = "users";
      //const endKey = ["George"];
      const viewUrl = "/_design/all_users/_view/all";
       
      const queryOptions = {
          key:matriculationnumber,
          incude_docs:true
      };
       try{

          var {data, headers, status} = await couch.get(dbName, viewUrl, queryOptions);
          if (data.rows && data.rows.length>0){ 
               const dbpassword= data["rows"][0].value
              if(bcrypt.compareSync(password, dbpassword)){
                const token = jwtAuth.sign({ sub: data.rows }, config.secret, { expiresIn: '7d' });
                res.cookie('token', token);
                return res.redirect('/dashboard');
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

app.get("/logout", isAuth, (req,res) =>{
  res.clearCookie("token");
   res.redirect("/");
});

app.get("/dashboard", isAuth, (req,res) =>{
   res.render("dashboard");
});

app.get("/add/matriculation", (req,res) =>{
   res.render("add-matriculation");
});

// { }
app.post("/matriculation", async(req,res) =>{
   try{
      console.log("add matriculation", req.body)
      const matriculation_number = req.body.matriculationnumber;

      const dbName = "authorized_matriculation";
      couch.uniqid().then(function(ids){
        const id = ids[0];
        couch.insert(dbName, {
           _id: id,
            matriculationNumbers: matriculation_number
          }).then(
              function(data, headers, status){
                res.redirect('/add/matriculation');
              },
              function(err){
                res.send(err);
          });
      });
   } catch(error){
      console.log("error", error)
      res.status(400).send(error.message)
   }
});

app.listen(3000, function(){
   console.log('Server Started On Port 3000');
});