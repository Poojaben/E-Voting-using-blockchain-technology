#!/bin/bash
#
# SPDX-License-Identifier: Apache-2.0

function _exit(){
    printf "Exiting:%s\n" "$1"
    exit -1
}

# Exit on first error, print all commands.
set -ev
set -o pipefail

# Where am I?
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export FABRIC_CFG_PATH="${DIR}/../config"

cd "${DIR}/../test-network/"

docker kill cliVerifier cliOrganiser logspout || true
./network.sh down

./network.sh up createChannel -ca -s couchdb

# Copy the connection profiles so they are in the correct organizations.
cp "${DIR}/../test-network/organizations/peerOrganizations/org1.example.com/connection-org1.yaml" "${DIR}/organization/verifier/gateway/"
cp "${DIR}/../test-network/organizations/peerOrganizations/org2.example.com/connection-org2.yaml" "${DIR}/organization/organiser/gateway/"

cp ${DIR}/../test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/* ${DIR}/../test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem
cp ${DIR}/../test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/* ${DIR}/../test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/priv_sk

cp ${DIR}/../test-network/organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/signcerts/* ${DIR}/../test-network/organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/signcerts/User1@org2.example.com-cert.pem
cp ${DIR}/../test-network/organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/keystore/* ${DIR}/../test-network/organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/keystore/priv_sk

echo Suggest that you monitor the docker containers by running
echo "./organization/organiser/configuration/cli/monitordocker.sh net_test"




./network.sh deployCC -ccn papercontract -ccp ${DIR}/organization/organiser/contract -ccl javascript
curl -X PUT http://admin:adminpw@localhost:5984/election
curl -X PUT http://admin:adminpw@localhost:5984/election/_design/all_elections -d '{ "views": {
   "all": {
    "map": "function (doc) {\n if(doc.type == \"election\"){\n  emit(doc._id, {type:doc.type,election_name:doc.election_name,election_date:doc.election_date,ballot:doc.ballot,voterlist:doc.voterlist,candidate_1:doc.candidate_1,candidate_2:doc.candidate_2,candidate_3:doc.candidate_3,rev:doc._rev});\n}\n  if(doc.type == \"student\"){\n    emit(doc._id,{type:doc.type,fname:doc.fname,branch:doc.branch,rev:doc._rev});\n  }\n  \n  \n}\n"
   }
  }}'
curl -X PUT http://admin:adminpw@localhost:5984/users
curl -X PUT http://admin:adminpw@localhost:5984/users/_design/all_users -d '{ "views": {
   "users": {
    	"map": "function (doc) {\n  emit(doc.matriculationnumber, {id:doc._id,firstname:doc.firstname,lastname:doc.lastname,matriculationnumber:doc.matriculationnumber,course:doc.course,branch:doc.branch,semester:doc.semester,email:doc.email,password:doc.password,is_admin:doc.is_admin,user_type:doc.user_type,rev:doc._rev});\n}"
   }
  }}'
curl -H 'Content-Type: application/json' -X POST http://admin:adminpw@localhost:5984/users -d '{"firstname": "admin", "lastname": "admin", "matriculationnumber": "0000111", "course": "","branch": "", "semester": "", "email": "admin@gmail.com", "password": "$2a$10$ZCL2q1p32pgnBl8dzhiELuVtptLx9lAZCwpHnDQFOQwiPoknepmOm", "is_admin":true, "user_type": "organizer"}'
curl -H 'Content-Type: application/json' -X POST http://admin:adminpw@localhost:5984/users -d '{"firstname": "admin", "lastname": "admin", "matriculationnumber": "0000222", "course": "","branch": "", "semester": "", "email": "admin@gmail.com", "password": "$2a$10$ZCL2q1p32pgnBl8dzhiELuVtptLx9lAZCwpHnDQFOQwiPoknepmOm", "is_admin":true, "user_type": "verifier"}'
cd "${DIR}/organization/organiser/application"
node "enrollAdmin.js"
cd "${DIR}/organization/verifier/application"
node "enrollAdmin.js"
