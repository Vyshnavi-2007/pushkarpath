const path = require('path');
process.chdir(path.join(__dirname, '..'));

console.log('Loading PushkarPath server in-process...');
const { server } = require(path.join(__dirname, '../server/index'));

function waitServer() {
  if (server.listening) {
    console.log('PushkarPath server is listening on port 5000! Starting acceptance tests...\n');
    runTests();
  } else {
    setTimeout(waitServer, 300);
  }
}

function runTests() {
  // Execute test suite
  require('./api-tests');
}

waitServer();
