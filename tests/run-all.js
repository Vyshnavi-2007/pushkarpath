const { spawn } = require('child_process');
const http = require('http');

console.log('Starting PushkarPath server in background...');
const server = spawn('node', ['server/index.js'], { stdio: 'inherit' });

function pollHealth(retries = 30) {
  if (retries <= 0) {
    console.error('Server failed to start within timeout.');
    server.kill();
    process.exit(1);
  }

  const req = http.get('http://127.0.0.1:5000/health', (res) => {
    if (res.statusCode === 200) {
      console.log('Server is healthy! Running tests...');
      runTests();
    } else {
      setTimeout(() => pollHealth(retries - 1), 500);
    }
  });

  req.on('error', () => {
    setTimeout(() => pollHealth(retries - 1), 500);
  });
}

function runTests() {
  const tests = spawn('node', ['tests/api-tests.js'], { stdio: 'inherit' });

  tests.on('exit', (code) => {
    console.log(`\nTests finished with exit code: ${code}`);
    server.kill();
    process.exit(code || 0);
  });
}

// Start polling
pollHealth();
