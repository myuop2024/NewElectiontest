import { config } from 'dotenv';
import { exec } from 'child_process';

config();

exec('./node_modules/.bin/drizzle-kit push', (err, stdout, stderr) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stdout);
  console.error(stderr);
});
