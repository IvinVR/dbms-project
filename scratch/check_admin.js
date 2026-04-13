const path = require('path');
const dbPath = path.join(__dirname, '..', 'server', 'db');
const pool = require(dbPath);

async function checkAdmin() {
  try {
    const [rows] = await pool.query("SELECT id, name, email, password, role, status FROM users WHERE role = 'Admin'");
    console.log('--- CURRENT ADMIN USERS ---');
    if (rows.length === 0) {
      console.log('No Admin found!');
    } else {
      rows.forEach(r => {
        console.log(`ID: ${r.id} | Name: ${r.name} | Email: ${r.email} | Pwd: ${r.password} | Status: ${r.status}`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('Error checking admin:', err);
    process.exit(1);
  }
}

checkAdmin();
