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
 * 4. Construct request to buy ballot paper
 * 5. Submit transaction
 * 6. Process response
 */

'use strict';
const fs = require('fs');
const yaml = require('js-yaml');
const { Wallets, Gateway } = require('fabric-network');
const BallotPaper = require('../contract/lib/paper.js');

// Main program function
async function main() {

    // A wallet stores a collection of identities for use
    const wallet = await Wallets.newFileSystemWallet('../identity/user/isabella/wallet');

    // A gateway defines the peers used to access Fabric networks
    const gateway = new Gateway();

    // Main try/catch block
    try {

        // Specify userName for network access
        // const userName = 'isabella.issuer@magnetocorp.com';
        const userName = 'isabella';

        // Load connection profile; will be used to locate a gateway
        let connectionProfile = yaml.safeLoad(fs.readFileSync('../gateway/connection-org2.yaml', 'utf8'));

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

        const contract = await network.getContract('papercontract', 'org.papernet.ballotpaper');

        // buy ballot paper
        console.log('Submit ballot paper casting vote transaction.');

        const castResponse = await contract.submitTransaction('cast', '00001', '123457', '2020-03-12','Sam');

        // process response
        console.log('Process casting vote transaction response.');

        let paper = BallotPaper.fromBuffer(castResponse);

        console.log(userName+`submitted ballot: ${paper.ballotNumber} successfully to Verifier`);
        console.log('Transaction complete.');

    } catch (error) {

        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);

    } finally {

        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        gateway.disconnect();

    }
}
main().then(() => {

    console.log('Casting vote program complete.');

}).catch((e) => {

    console.log('Casting vote program exception.');
    console.log(e);
    console.log(e.stack);
    process.exit(-1);

});
