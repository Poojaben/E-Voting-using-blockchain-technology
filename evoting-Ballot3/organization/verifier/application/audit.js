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
 * 4. Construct request to audit ballot paper
 * 5. Submit transaction
 * 6. Process response
 */

//'use strict';

// Bring key classes into scope, most importantly Fabric SDK network class
const fs = require('fs');
const yaml = require('js-yaml');
const { Wallets, Gateway } = require('fabric-network');
const BallotPaper = require('../contract/lib/paper.js');


// Main program function
exports.doneAudit = async function main(voter,btNumber,elNumber) {

  // A wallet stores a collection of identities for use
  const wallet = await Wallets.newFileSystemWallet('../../identity/user/balaji/wallet');


  // A gateway defines the peers used to access Fabric networks
  const gateway = new Gateway();

  // Main try/catch block
  try {

    // Specify userName for network access
        // Specify userName for network access
        const userName = voter;

    // Load connection profile; will be used to locate a gateway
    let connectionProfile = yaml.safeLoad(fs.readFileSync('../../gateway/connection-org1.yaml', 'utf8'));

    // Set connection options; identity and wallet
    let connectionOptions = {
      identity: userName,
      wallet: wallet,
      discovery: { enabled:true, asLocalhost: true }
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

    // audit ballot paper
    console.log('Submit ballot paper audit transaction.');
    var d = new Date();
    var date = (d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate());

    const auditResponse = await contract.submitTransaction('audit', btNumber,elNumber, d);

    // process response
    console.log('Process audit transaction response.');

    let paper = BallotPaper.fromBuffer(auditResponse);

    console.log(`Ballot : ${paper.ballotNumber} is successfully audited by Verifier`);

    console.log('Transaction complete.');

  } catch (error) {

    console.log(`Error processing transaction. ${error}`);
    console.log(error.stack);

  } finally {

    // Disconnect from the gateway
    console.log('Disconnect from Fabric gateway.')
    gateway.disconnect();

  }
}
exports.doneAudit().then(() => {

  console.log('Audit program complete.');

}).catch((e) => {

  console.log('Audit program exception.');
  console.log(e);
  console.log(e.stack);
  process.exit(-1);

});
