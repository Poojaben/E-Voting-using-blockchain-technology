/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

/*
 * This application has 6 basic steps:
 * 1. Select an identity from a wallet
 * 2. Connect to network gateway
 * 3. Access PaperNet network
 * 4. Construct request to query the ledger
 * 5. Evaluate transactions (queries)
 * 6. Process responses
 */

//'use strict';

// Bring key classes into scope, most importantly Fabric SDK network class
const fs = require('fs');
const yaml = require('js-yaml');
const { Wallets, Gateway } = require('fabric-network');



// Main program function
exports.results= async function main(electionName,electionNumber,candidate_1,candidate_2,candidate_3){
   
    // A wallet stores a collection of identities for use
    const wallet = await Wallets.newFileSystemWallet('../../identity/user/isabella/wallet');


    // A gateway defines the peers used to access Fabric networks
    const gateway = new Gateway();

    // Main try/catch block
    try {

        // Specify userName for network access
        const userName = 'isabella';

        // Load connection profile; will be used to locate a gateway
        let connectionProfile = yaml.safeLoad(fs.readFileSync('../../gateway/connection-org2.yaml', 'utf8'));

        // Set connection options; identity and wallet
        let connectionOptions = {
            identity: userName,
            wallet: wallet,
            discovery: { enabled: true, asLocalhost: true }

        };

        // Connect to gateway using application specified parameters
        console.log('Connect to Fabric gateway.');

        await gateway.connect(connectionProfile, connectionOptions);

        // Access PaperNet network
        console.log('Use network channel: mychannel.');

        const network = await gateway.getNetwork('mychannel');

        // Get addressability to ballot paper contract
        console.log('Use org.papernet.ballotpaper smart contract.');

        const contract = await network.getContract('papercontract');
/*
        // queries - ballot paper
        console.log('-----------------------------------------------------------------------------------------');
        console.log('****** Submitting ballot paper queries ****** \n\n ');


        // 1 asset history
        console.log('1. Query Ballot Paper History....');
        console.log('-----------------------------------------------------------------------------------------\n');
        let queryResponse = await contract.evaluateTransaction('queryHistory', electionNumber,'00002' );

        let json = JSON.parse(queryResponse.toString());
        console.log(json);
        console.log('\n\n');
        console.log('\n  History query complete.');
        console.log('-----------------------------------------------------------------------------------------\n\n');

        // 2 Election query
        console.log('2. Query election Number .... ballots data in an election');
        console.log('-----------------------------------------------------------------------------------------\n');
        let queryResponse2 = await contract.evaluateTransaction('queryElection', electionNumber);
        json = JSON.parse(queryResponse2.toString());
        console.log(json);
        console.log('\n\n');
        console.log('\n  Paper election number query complete.');
        console.log('-----------------------------------------------------------------------------------------\n\n');
       */ 
      
       exports.Name=""+electionName;
      
       // 1 Election with vote casted query
        console.log('3. Query  .... number of ballots casted in an election');
        console.log('-----------------------------------------------------------------------------------------\n');
        let queryResponse3 = await contract.evaluateTransaction('countQueryElection', electionNumber);
        json = JSON.parse(queryResponse3.toString());
        exports.json1=json;
        exports.number= ""+electionNumber;
        console.log(json);

        console.log('\n\n');
        console.log('\n  Paper election number  count query complete.');
        console.log('-----------------------------------------------------------------------------------------\n\n');

       // 4 number of votes casted for selected candidate  query
        console.log('4. Query ballot Paper .... votes casted for a candidate in an election');
        console.log('-----------------------------------------------------------------------------------------\n');
        let queryResponse4 = await contract.evaluateTransaction('countQueryselCandidateElection', electionNumber,candidate_1);
        json = JSON.parse(queryResponse4.toString());
        exports.json2=json;
        exports.cand1= ""+candidate_1;
        console.log(json);

        console.log('\n\n');
        console.log('\n  candidate  votes count for an election query complete.');
        console.log('-----------------------------------------------------------------------------------------\n\n');
      
       // 4 number of votes casted for selected candidate  query
      console.log('4. Query ballot Paper .... votes casted for a candidate in an election');
      console.log('-----------------------------------------------------------------------------------------\n');
      let queryResponse9 = await contract.evaluateTransaction('countQueryselCandidateElection', electionNumber,candidate_2);
      json = JSON.parse(queryResponse9.toString());
      exports.json3=json;
      exports.cand2=""+candidate_2;
      console.log(json);

      console.log('\n\n');
      console.log('\n  candidate  votes count for an election query complete.');
      console.log('-----------------------------------------------------------------------------------------\n\n');
    
      
      // 4 number of votes casted for selected candidate  query
      console.log('4. Query ballot Paper .... votes casted for a candidate in an election');
      console.log('-----------------------------------------------------------------------------------------\n');
      let queryResponse10 = await contract.evaluateTransaction('countQueryselCandidateElection', electionNumber,candidate_3);
      json = JSON.parse(queryResponse10.toString());
      exports.json4=json;
      exports.cand3=""+candidate_3;
      console.log(json);

      console.log('\n\n');
      console.log('\n  candidate  votes count for an election query complete.');
      console.log('-----------------------------------------------------------------------------------------\n\n');
    
      
      /*  // 5 selected candidate  query
        console.log('5. Query ballot Paper .... ballots data for a candidate in an election');
        console.log('-----------------------------------------------------------------------------------------\n');
        let queryResponse5 = await contract.evaluateTransaction('queryselCandidateElection', '123457','Sam');
        json = JSON.parse(queryResponse5.toString());
        console.log(json);

        console.log('\n\n');
        console.log('\n  Paper candidate data query complete.');
        console.log('-----------------------------------------------------------------------------------------\n\n');

        // 6 partial key query
        console.log('6. Query Paper Partial Key.... Papers in org.papernet.papers namespace and prefixed MagnetoCorp');
        console.log('-----------------------------------------------------------------------------------------\n');
        let queryResponse6 = await contract.evaluateTransaction('queryPartial', '00005');

        json = JSON.parse(queryResponse6.toString());
        console.log(json);
        console.log('\n\n');

        console.log('\n  Partial Key query complete.');
        console.log('-----------------------------------------------------------------------------------------\n\n');


        // 7 Named query - all tallied papers
        console.log('7. Named Query: ... All papers in org.papernet.papers that are in current state of tallied');
        console.log('-----------------------------------------------------------------------------------------\n');
        let queryResponse7 = await contract.evaluateTransaction('queryNamed', 'tallying');

        json = JSON.parse(queryResponse7.toString());
        console.log(json);
        console.log('\n\n');

        console.log('\n  Named query "tallying" complete.');
        console.log('-----------------------------------------------------------------------------------------\n\n');


        // 8 named query - by value
        console.log('8. Named Query:.... All papers in org.papernet.papers  that are in issue state currently');
        console.log('-----------------------------------------------------------------------------------------\n');
        let queryResponse8 = await contract.evaluateTransaction('queryNamed', 'issued');

        json = JSON.parse(queryResponse8.toString());
        console.log(json);
        console.log('\n\n');

        console.log('\n  Named query by "issued" complete.');
        console.log('-----------------------------------------------------------------------------------------\n\n');
    */} catch (error) {

        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);

    } finally {

        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        gateway.disconnect();

    }
}
exports.results().then(() => {

    console.log('Queryapp program complete.');

}).catch((e) => {

    console.log('Queryapp program exception.');
    console.log(e);
    console.log(e.stack);
    process.exit(-1);

});
