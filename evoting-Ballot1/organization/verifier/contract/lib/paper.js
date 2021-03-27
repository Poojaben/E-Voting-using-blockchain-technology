/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Utility class for ledger state
const State = require('./../ledger-api/state.js');

// Enumerate ballot paper state values
const cpState = {
    ISSUED: 1,
    PENDING: 2,
    TALLYING: 3,
    AUDITED: 4
};

/**
 * BallotPaper class extends State class
 * Class will be used by application and smart contract to define a paper
 */
class BallotPaper extends State {

    constructor(obj) {
        super(BallotPaper.getClass(), [obj.electionNumber, obj.ballotNumber]);
        Object.assign(this, obj);
    }

    /**
     * Basic getters and setters
    */
    getVoter() {
        return this.voter;
    }

    setVoter(newVoter) {
        this.voter = newVoter;
    }

    getOwner() {
        return this.owner;
    }

    setOwnerMSP(mspid) {
        this.mspid = mspid;
    }

    getOwnerMSP() {
        return this.mspid;
    }

    setOwner(newOwner) {
        this.owner = newOwner;
    }
    setSelCandidate(newSelCandidate){
    this.selCandidate=newSelCandidate;
    }
    getSelCandidate(){
    return this.selCandidate;
    }
    /**
     * Useful methods to encapsulate ballot paper states
     */
    setIssued() {
        this.currentState = cpState.ISSUED;
    }

    setTallying() {
        this.currentState = cpState.TALLYING;
    }

    setAudited() {
        this.currentState = cpState.AUDITED;
    }

    setPending() {
        this.currentState = cpState.PENDING;
    }

    isIssued() {
        return this.currentState === cpState.ISSUED;
    }

    isTallying() {
        return this.currentState === cpState.TALLYING;
    }

    isAudited() {
        return this.currentState === cpState.AUDITED;
    }

    isPending() {
        return this.currentState === cpState.PENDING;
    }

    static fromBuffer(buffer) {
        return BallotPaper.deserialize(buffer);
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to ballot paper
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return State.deserializeClass(data, BallotPaper);
    }

    /**
     * Factory method to create a ballot paper object
     */
    static createInstance(voter, ballotNumber, issueDate, electionDate, electionNumber) {
        return new BallotPaper({ voter, ballotNumber, issueDate, electionDate, electionNumber});
    }

    static getClass() {
        return 'org.papernet.ballotpaper';
    }
}

module.exports = BallotPaper;
