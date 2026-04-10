const pool = require('./server/db');

async function fix() {
  try {
    await pool.query("ALTER TABLE notifications MODIFY icon VARCHAR(100)");
    await pool.query("ALTER TABLE inventory MODIFY icon VARCHAR(100)");
    console.log("Altered tables successfully.");
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
fix();
