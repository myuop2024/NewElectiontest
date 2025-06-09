#!/usr/bin/env node

import { spawn } from 'child_process';

const child = spawn('npm', ['run', 'db:push'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Send Enter key to select the default option (No, add the constraint without truncating)
setTimeout(() => {
  child.stdin.write('\n');
}, 2000);

child.on('close', (code) => {
  console.log(`Migration completed with exit code ${code}`);
  process.exit(code);
});