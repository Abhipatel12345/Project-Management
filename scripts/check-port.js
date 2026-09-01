const net = require('net');

const REQUIRED_PORT = 3000;

/**
 * Check if the required development port is free before Next.js starts.
 * This prevents Next.js from silently falling back to ports 3001, 3002, 3003...
 */
function verifyPortAvailable(port) {
  const tester = net.createServer();

  tester.once('error', (err) => {
    if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
      console.error('\n\x1b[31m[PDM Dev Server Error]\x1b[0m Port ' + port + ' is already in use by another process.');
      console.error('\x1b[33mTo free port ' + port + ' on Windows PowerShell, run:\x1b[0m');
      console.error('  Get-Process -Id (Get-NetTCPConnection -LocalPort ' + port + ').OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force\n');
      process.exit(1);
    } else {
      console.error('[PDM Dev Server] Error checking port ' + port + ':', err.message);
      process.exit(1);
    }
  });

  tester.once('listening', () => {
    tester.close(() => {
      // Port is clear, allow Next.js to start on port 3000
      process.exit(0);
    });
  });

  tester.listen(port);
}

verifyPortAvailable(REQUIRED_PORT);
