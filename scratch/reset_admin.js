const path = require('path');
const dbPath = path.join(__dirname, '..', 'server', 'db');
const pool = require(dbPath);

async function resetAdmin() {
  try {
    // 1. Check current admins
    const [admins] = await pool.query("SELECT * FROM users WHERE role = 'Admin'");
    console.log('--- FOUND ADMINS ---');
    console.table(admins);

    const targetEmail = 'vrajeshivin@gmail.com';
    const targetPass = 'admin123';

    if (admins.length > 0) {
      // Update existing admin
      console.log(`Updating existing admin (ID: ${admins[0].id}) to ${targetEmail}...`);
      await pool.query(
        "UPDATE users SET email = ?, password = ?, name = 'Admin', status = 'active' WHERE id = ?",
        [targetEmail, targetPass, admins[0].id]
      );
    } else {
      // Create new admin if none exist
      console.log(`No admin found. Creating new admin with email ${targetEmail}...`);
      await pool.query(
        "INSERT INTO users (name, email, password, role, batch, status) VALUES ('Admin', ?, ?, 'Admin', '-', 'active')",
        [targetEmail, targetPass]
      );
    }

    console.log('✅ Admin credentials successfully reset!');
    console.log(`Email: ${targetEmail}`);
    console.log(`Password: ${targetPass}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting admin:', err);
    process.exit(1);
  }
}

resetAdmin();
