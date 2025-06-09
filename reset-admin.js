const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Admin123!@#';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hash for Admin123!@#:');
  console.log(hash);
}

generateHash();