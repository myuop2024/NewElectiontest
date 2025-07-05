import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

async function resetAdmin() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Delete existing admin user
    await pool.query('DELETE FROM users WHERE email = $1', ['admin@caffe.org.jm']);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password', 10);
    
    // Create new admin user
    await pool.query(`
      INSERT INTO users (
        username, email, observer_id, first_name, last_name, phone, 
        parish_id, address, community, role, status, kyc_status, 
        training_status, security_level, password, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      )
    `, [
      'admin',
      'admin@caffe.org.jm', 
      '970618',
      'CAFFE',
      'Administrator',
      '876-000-0000',
      1,
      'CAFFE Headquarters, Kingston, Jamaica',
      'New Kingston',
      'admin',
      'active',
      'verified',
      'certified',
      1,
      hashedPassword
    ]);
    
    console.log('Admin user reset successfully!');
    console.log('Email: admin@caffe.org.jm');
    console.log('Password: password');
    
  } catch (error) {
    console.error('Error resetting admin:', error);
  } finally {
    await pool.end();
  }
}

resetAdmin();