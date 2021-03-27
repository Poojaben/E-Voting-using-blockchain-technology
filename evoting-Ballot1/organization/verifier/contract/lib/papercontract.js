/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Fabric smart contract classes
const { Contract, Context } = require('fabric-contract-api');

// PaperNet specific classes
const BallotPaper = require('./paper.js');
const PaperList = require('./paperlist.js');
const QueryUtils = require('./queries.js');

/**
 * A custom context provides easy access to list of all ballot papers
 */
class BallotPaperContext extends Context {

    constructor() {
        super();
        // All papers are held in a list of papers
        this.paperList = new PaperList(this);
    }

}

/**
 * Define ballot paper smart contract by extending Fabric Contract class
 *
 */
class BallotPaperContract extends Contract {

    constructor() {
        // Unique namespace when multiple contracts per chaincode file
        super('org.papernet.ballotpaper');
    }

    /**
     * Define a custom context for ballot paper
    */
    createContext() {
        return new BallotPaperContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async instantiate(ctx) {
        // No implementation required with this example
        // It could be where data migration is performed, if necessary
        console.log('Instantiate the contract');
    }

    /**
     * Issue ballot paper
     *
     * @param {Context} ctx the transaction context
     * @param {String} voter Student voter
     * @param {Integer} ballotNumber ballot number for this voter
     * @param {String} issueDate paper issue date
     * @param {String} electionDate paper maturity date
     * @param {String} electionNumber elect value of paper
    */
    async issue(ctx, voter, ballotNumber, issueDate, electionDate, electionNumber) {
        if(voter==''| ballotNumber==''|issueDate==''|electionDate==''|electionNumber==''){
            throw new Error('Please provide required data, Ballot is not issued'); 
        }
        else{
           
            try{
                let paperKey = BallotPaper.makeKey([electionNumber, ballotNumber]);
                let paper = await ctx.paperList.getPaper(paperKey);
                paper.getCurrentState();
                console.log('record already exists'); 
                return null;
            }
            catch{
                // create an instance of the paper
    
        let paper = BallotPaper.createInstance(voter, ballotNumber, issueDate, electionDate, electionNumber);

        // Smart contract, rather than paper, moves paper into ISSUED state
        paper.setIssued();

        // save the owner's MSP 
        let mspid = ctx.clientIdentity.getMSPID();
       // paper.setOwnerMSP(mspid);

        // Newly issued paper is owned by the voter to begin with (recorded for reporting purposes)
        //paper.setOwner(voter);

        // Add the paper to the list of all similar ballot papers in the ledger world state
        await ctx.paperList.addPaper(paper);

        // Must return a serialized paper to caller of smart contract
        return paper;
    }}}

    /**
     * Cast Ballot paper
     *
      * @param {Context} ctx the transaction context
      * @param {String} voter Student voter 
      * @param {Integer} ballotNumber ballot number for this voter
      * @param {String} electionNumber election Number 
      * @param {String} castedonDate paper maturity date
      * @param {String} selCandidate candidate selected for this ballot 
      
     */
    async cast(ctx, voter, ballotNumber, electionNumber, castedonDate, selCandidate) {
        if(voter==''| ballotNumber==''|electionNumber==''|selCandidate==''){
            throw new Error('Please provide required data, vote is not casted'); 
        }
        else{
        // Retrieve the current paper using key fields provided
        let paperKey = BallotPaper.makeKey([electionNumber, ballotNumber]);
        let paper = await ctx.paperList.getPaper(paperKey);

        // Validate current owner
       // if (paper.getOwner() !== currentOwner) {
       //     throw new Error('\nPaper ' + voter + ballotNumber + ' is not owned by ' + currentOwner);
       // }

        // First cast moves state from ISSUED to Tallying (when running )
        if (paper.isIssued()) {
            paper.setTallying();
            paper.votedOnDate=castedonDate
           // paper.setOwner(newOwner);
            // save the owner's MSP 
           // let mspid = ctx.clientIdentity.getMSPID();
            //paper.setOwnerMSP('Org1MSP');
           
            paper.setSelCandidate(selCandidate);

        } else {
            throw new Error('\nPaper ' + voter + ballotNumber + ' is not valid. Current state = ' + paper.getCurrentState());
        }

        // Update the paper
        await ctx.paperList.updatePaper(paper);
        return paper;
    }}

    /**
      *  Cast request:  (2-phase confirmation: ballot paper is 'PENDING' subject to completion university decision for special requests)
      *  Alternative to 'cast' transaction
      *  Note: 'cast_request' puts ballot in 'PENDING' state - subject to university confirmation [below].
      * 
      * @param {Context} ctx the transaction context
      * @param {String} voter Student voter
      * @param {Integer} ballotNumber ballot number for this voter
      * @param {String} castedonDate paper maturity date
      * @param {String} selCandidate candidate selected for this ballot 
      * @param {String} electionNumber election Number 
     */
    async cast_request(ctx, voter, ballotNumber, castedonDate, selCandidate, electionNumber) {
        if(voter==''| ballotNumber==''|electionNumber==''|selCandidate==''){
            throw new Error('Please provide required data, vote is not casted'); 
        }
else{
        // Retrieve the current paper using key fields provided
        let paperKey = BallotPaper.makeKey([electionNumber, ballotNumber]);
        let paper = await ctx.paperList.getPaper(paperKey);

        if (paper.isIssued()) {
            paper.setPending();
            paper.votedOnDate=castedonDate
           // paper.setOwner(newOwner);
            // save the owner's MSP 
           // let mspid = ctx.clientIdentity.getMSPID();
            //paper.setOwnerMSP('Org1MSP');
           
            paper.setSelCandidate(selCandidate);

        } else {
            throw new Error('\nPaper ' + voter + ballotNumber + ' is not valid. Current state = ' + paper.getCurrentState());
        }
        // paper set to 'PENDING' - can only be transferred (confirmed) by identity from owning org (MSP check).
        

        // Update the paper
        await ctx.paperList.updatePaper(paper);
        return paper;
    }}

    /**
     * cast_confirm ballot paper: only the owning org has authority to execute. It is the complement to the 'buy_request' transaction. '[]' is optional below.
     * eg. issue -> cast_request -> cast_confirm confirm -> audit
     * this transaction 'pair' is an alternative to the straight issue -> buy -> [buy....n] -> audit ...path
     *
     * @param {Context} ctx the transaction context
     * @param {String} voter Student voter 
     * @param {Integer} ballotNumber ballot number for this voter
     * @param {String} confirmDate  confirmed transfer date.
    * @param {String} electionNumber election Number 
     */
    async cast_confirm(ctx, voter, ballotNumber, confirmDate,electionNumber) {
        if(voter==''| ballotNumber==''|electionNumber==''){
            throw new Error('Please provide required data, cast_request cannot  confirmed'); 
        }
        else{
        // Retrieve the current paper using key fields provided
        let paperKey = BallotPaper.makeKey([electionNumber, ballotNumber]);
        let paper = await ctx.paperList.getPaper(paperKey);

        // Validate current owner's MSP in the paper === invoking transferor's MSP id - can only transfer if you are the owning org.

     
        // Paper needs to be 'pending' - which means you need to have run 'buy_pending' transaction first.
        if ( ! paper.isPending()) {
            throw new Error('\n' + voter + ballotNumber + ' is not currently in state: PENDING for tallying to occur: \n must run cast_request transaction first');
        }
        // else all good

        paper.setTallying();
        paper.confirmDate = confirmDate;

        // Update the paper
        await ctx.paperList.updatePaper(paper);
        return paper;
    }}

    /**
     * Audit ballot paper
     *
     * @param {Context} ctx the transaction context
     * @param {String} voter Student voter 
     * @param {Integer} ballotNumber ballot number for this voter
     * @param {String} electionNumber election Number 
     * @param {String} auditDate time ballot was audit

    */
    async audit(ctx, voter, ballotNumber, electionNumber, auditDate) {
        if(voter==''| ballotNumber==''|electionNumber==''){
            throw new Error('Please provide required data, Ballot is not audited'); 
        }
        else{
        let paperKey = BallotPaper.makeKey([electionNumber, ballotNumber]);

        let paper = await ctx.paperList.getPaper(paperKey);

        // Check paper is in a state of ISSUED
        if (paper.isIssued()| paper.isPending()) {
            throw new Error('\nPaper ' + voter + ballotNumber + ' did not cast his vote');
        }
else if (paper.isTallying()){
    
          paper.setAudited();
          paper.auditDate= auditDate; // record audit date against the asset (the complement to 'issue date')
      } else {
        paper.auditDate= auditDate;
      }
  await ctx.paperList.updatePaper(paper);
  return paper;
}}
        // Validate current auditor's MSP matches the invoking auditor's MSP id - can only audit if you are the owning org.

       // if (paper.getOwnerMSP() !== ctx.clientIdentity.getMSPID()) {
       //     throw new Error('\nPaper ' + voter + ballotNumber + ' cannot be audited by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
       // }

        // As this is just a sample, can show additional verification check: that the auditor provided matches that on record, before auditing it
    
    // Query transactions

    /**
     * Query history of a ballot paper
     * @param {Context} ctx the transaction context
     * @param {Integer} ballotNumber ballot number for this voter
     * @param {String} electionNumber election Number 
    */
    async queryHistory(ctx, electionNumber, ballotNumber) {

        // Get a key to be used for History query

        let query = new QueryUtils(ctx, 'org.papernet.paper');
        let results = await query.getAssetHistory(electionNumber, ballotNumber); // (cpKey);
        return results;

    }

    /**
    * queryElection ballot paper: supply election Number to get its data
    * @param {Context} ctx the transaction context
    * @param {String} electionNumber election number
    */
    async queryElection(ctx, electionNumber) {

        let query = new QueryUtils(ctx, 'org.papernet.paper');
        let election_data = await query.queryKeyByElection(electionNumber);

        return election_data;
    }
 /**
    * queryElection ballot paper: Number of votes casted for an election
    * @param {Context} ctx the transaction context
    * @param {String} electionNumber election number
    */
   async countQueryElection(ctx, electionNumber) {

    let query = new QueryUtils(ctx, 'org.papernet.paper');
    let election_data = await query.queryKeyByElectionCasted(electionNumber);

    return (election_data.length);
}
    /**
    * queryselCandidateElection ballot paper: supply election Number and candidate name to get its data
    * @param {Context} ctx the transaction context
    * @param {String} electionNumber election number
    * @param {String} selCandidate candidate selected for this ballot 
    */
   async queryselCandidateElection(ctx, electionNumber,selCandidate) {

    let query = new QueryUtils(ctx, 'org.papernet.paper');
    let candidate = await query.queryCandElection(electionNumber,selCandidate);
    
    return candidate;
}


   /**
    * countQueryselCandidateElection ballot paper: supply election Number and candidate name to get its data 
    * @param {Context} ctx the transaction context
    * @param {String} electionNumber election number
    * @param {String} selCandidate candidate selected for this ballot 
    */
   async countQueryselCandidateElection(ctx, electionNumber,selCandidate) {

    let query = new QueryUtils(ctx, 'org.papernet.paper');
    let candidate = await query.queryCandElection(electionNumber,selCandidate);
    
    return (candidate.length);
}
    /**
    * queryPartial ballot paper - provide a prefix eg. "Verifier" will list all papers _issued_ by Verifier etc etc
    * @param {Context} ctx the transaction context
    * @param {String} prefix asset class prefix (added to paperlist namespace) eg. org.papernet.paperOrganiser asset listing: papers issued by Organiser.
    */
    async queryPartial(ctx, prefix) {

        let query = new QueryUtils(ctx, 'org.papernet.paper');
        let partial_results = await query.queryKeyByPartial(prefix);

        return partial_results;
    }

    /**
    * queryAdHoc ballot paper - supply a custom mango query
    * eg - as supplied as a param:     
    * ex1:  ["{\"selector\":{\"faceValue\":{\"$lt\":8000000}}}"]
    * ex2:  ["{\"selector\":{\"faceValue\":{\"$gt\":4999999}}}"]
    * 
    * @param {Context} ctx the transaction context
    * @param {String} queryString querystring
    */
    async queryAdhoc(ctx, queryString) {

        let query = new QueryUtils(ctx, 'org.papernet.paper');
        let querySelector = JSON.parse(queryString);
        let adhoc_results = await query.queryByAdhoc(querySelector);

        return adhoc_results;
    }


    /**
     * queryNamed - supply named query - 'case' statement chooses selector to build (pre-canned for demo purposes)
     * @param {Context} ctx the transaction context
     * @param {String} queryname the 'named' query (built here) - or - the adHoc query string, provided as a parameter
     */
    async queryNamed(ctx, queryname) {
        let querySelector = {};
        switch (queryname) {
            case "audited":
                querySelector = { "selector": { "currentState": 4 } };  // 4 = audited state
                break;
            case "tallying":
                querySelector = { "selector": { "currentState": 3 } };  // 3 = tallying state
                break;
            case "issued":
                // may change to provide as a param - fixed value for now in this sample
                querySelector = { "selector":  { "currentState": 1 } };
                break;
            default: // else, unknown named query
                throw new Error('invalid named query supplied: ' + queryname + '- please try again ');
        }

        let query = new QueryUtils(ctx, 'org.papernet.paper');
        let adhoc_results = await query.queryByAdhoc(querySelector);

        return adhoc_results;
    }

}

module.exports = BallotPaperContract;
