// ═══════════════════════════════════════════
//  SCMS — Express API Server
//  All routes for the SmartCampus Management System
// ═══════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static frontend files (index.html, dashboard.html, styles.css, script.js)
app.use(express.static(path.join(__dirname, '..')));

// ═══════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, batch, status FROM users WHERE email = ? AND password = ?',
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Account is inactive. Contact admin.' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
//  USERS CRUD
// ═══════════════════════════════════════════

// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, batch, status, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, batch, status FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role, batch, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, batch) VALUES (?, ?, ?, ?, ?)',
      [name, email, password || 'campus123', role || 'Student', batch || '-']
    );

    const [newUser] = await pool.query('SELECT id, name, email, role, batch, status FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(newUser[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('=== DATABASE ERROR (POST /api/users) ===');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, email, role, batch, status } = req.body;
    const [result] = await pool.query(
      'UPDATE users SET name = ?, email = ?, role = ?, batch = ?, status = ? WHERE id = ?',
      [name, email, role, batch, status, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    const [updated] = await pool.query('SELECT id, name, email, role, batch, status FROM users WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT promote user
app.put('/api/users/:id/promote', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const chain = ['Student', 'Sub-Admin', 'Faculty', 'Admin'];
    const currentIdx = chain.indexOf(rows[0].role);

    if (currentIdx >= chain.length - 1) {
      return res.status(400).json({ error: 'User is already Admin' });
    }

    const newRole = chain[currentIdx + 1];
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [newRole, req.params.id]);

    const [updated] = await pool.query('SELECT id, name, email, role, batch, status FROM users WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Promote user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, name: rows[0].name });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
//  INVENTORY CRUD
// ═══════════════════════════════════════════

// GET all inventory items (optionally filter by category)
app.get('/api/inventory', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM inventory ORDER BY id';
    let params = [];

    if (category && category !== 'all') {
      query = 'SELECT * FROM inventory WHERE category = ? ORDER BY id';
      params = [category];
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create inventory item
app.post('/api/inventory', async (req, res) => {
  try {
    const { name, icon, category, total_qty } = req.body;
    if (!name) return res.status(400).json({ error: 'Item name is required' });

    const [result] = await pool.query(
      'INSERT INTO inventory (name, icon, category, total_qty, available_qty) VALUES (?, ?, ?, ?, ?)',
      [name, icon || '📦', category || 'Other', total_qty || 1, total_qty || 1]
    );

    const [newItem] = await pool.query('SELECT * FROM inventory WHERE id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update inventory item
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { name, icon, category, total_qty, available_qty } = req.body;
    const [result] = await pool.query(
      'UPDATE inventory SET name = ?, icon = ?, category = ?, total_qty = ?, available_qty = ? WHERE id = ?',
      [name, icon, category, total_qty, available_qty, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Item not found' });

    const [updated] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE inventory item
app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM inventory WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ success: true, name: rows[0].name });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
//  RESERVATIONS
// ═══════════════════════════════════════════

// GET all reservations (with user and item names)
app.get('/api/reservations', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.id, r.user_id, r.item_id, r.qty, r.status, r.due_date, r.created_at,
             u.name AS student, i.name AS item
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN inventory i ON r.item_id = i.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get reservations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET reservations for a specific user
app.get('/api/reservations/user/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.id, r.user_id, r.item_id, r.qty, r.status, r.due_date, r.created_at,
             u.name AS student, i.name AS item
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN inventory i ON r.item_id = i.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.userId]);
    res.json(rows);
  } catch (err) {
    console.error('Get user reservations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create reservation
app.post('/api/reservations', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { user_id, item_id, qty, due_date } = req.body;
    if (!user_id || !item_id) {
      return res.status(400).json({ error: 'user_id and item_id are required' });
    }

    await conn.beginTransaction();

    // Check availability
    const [items] = await conn.query('SELECT * FROM inventory WHERE id = ? FOR UPDATE', [item_id]);
    if (items.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];
    const reserveQty = qty || 1;

    if (item.available_qty < reserveQty) {
      await conn.rollback();
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    // Decrease available qty
    await conn.query('UPDATE inventory SET available_qty = available_qty - ? WHERE id = ?', [reserveQty, item_id]);

    // Create reservation
    const [result] = await conn.query(
      'INSERT INTO reservations (user_id, item_id, qty, status, due_date) VALUES (?, ?, ?, ?, ?)',
      [user_id, item_id, reserveQty, 'active', due_date || getFutureDate(7)]
    );

    await conn.commit();

    // Fetch full reservation with names
    const [newRes] = await pool.query(`
      SELECT r.id, r.user_id, r.item_id, r.qty, r.status, r.due_date,
             u.name AS student, i.name AS item
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN inventory i ON r.item_id = i.id
      WHERE r.id = ?
    `, [result.insertId]);

    res.status(201).json(newRes[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Create reservation error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT cancel reservation
app.put('/api/reservations/:id/cancel', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = rows[0];
    if (reservation.status === 'expired') {
      await conn.rollback();
      return res.status(400).json({ error: 'Reservation is already expired' });
    }

    // Update reservation status
    await conn.query('UPDATE reservations SET status = ? WHERE id = ?', ['expired', req.params.id]);

    // Return qty to inventory
    await conn.query('UPDATE inventory SET available_qty = available_qty + ? WHERE id = ?', [reservation.qty, reservation.item_id]);

    await conn.commit();

    // Fetch updated reservation with names
    const [updated] = await pool.query(`
      SELECT r.id, r.user_id, r.item_id, r.qty, r.status, r.due_date,
             u.name AS student, i.name AS item
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN inventory i ON r.item_id = i.id
      WHERE r.id = ?
    `, [req.params.id]);

    res.json(updated[0]);
  } catch (err) {
    await conn.rollback();
    console.error('Cancel reservation error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════

// GET all notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST send notification
app.post('/api/notifications', async (req, res) => {
  try {
    const { title, description, icon, icon_bg, created_by } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO notifications (icon, icon_bg, title, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [icon || '📬', icon_bg || 'background:var(--accent-lt);color:var(--accent)', title, description, created_by || null]
    );

    const [newNotif] = await pool.query('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
    res.status(201).json(newNotif[0]);
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notif read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT mark ALL notifications as read
app.put('/api/notifications/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE');
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
//  ANNOUNCEMENTS
// ═══════════════════════════════════════════

// GET all announcements (with author name)
app.get('/api/announcements', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, u.name AS author
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create announcement
app.post('/api/announcements', async (req, res) => {
  try {
    const { title, body, type, target_audience, author_id } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO announcements (title, body, type, target_audience, author_id) VALUES (?, ?, ?, ?, ?)',
      [title, body, type || 'default', target_audience || 'All', author_id || null]
    );

    const [newAnn] = await pool.query(`
      SELECT a.*, u.name AS author
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [result.insertId]);

    res.status(201).json(newAnn[0]);
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
//  SCHEDULE
// ═══════════════════════════════════════════

// GET full schedule
app.get('/api/schedule', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, u.name AS faculty_name
      FROM schedule s
      LEFT JOIN users u ON s.faculty_id = u.id
      ORDER BY FIELD(s.day_of_week, 'Mon','Tue','Wed','Thu','Fri'), s.time_slot
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get schedule error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST add schedule entry
app.post('/api/schedule', async (req, res) => {
  try {
    const { faculty_id, day_of_week, time_slot, subject, room, color_class } = req.body;
    if (!subject || !room || !day_of_week || !time_slot) {
      return res.status(400).json({ error: 'Subject, room, day, and time are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO schedule (faculty_id, day_of_week, time_slot, subject, room, color_class) VALUES (?, ?, ?, ?, ?, ?)',
      [faculty_id || null, day_of_week, time_slot, subject, room, color_class || 'sch-event-green']
    );

    const [newEntry] = await pool.query('SELECT * FROM schedule WHERE id = ?', [result.insertId]);
    res.status(201).json(newEntry[0]);
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════

app.get('/api/stats/admin', async (req, res) => {
  try {
    const [[users]] = await pool.query('SELECT COUNT(*) AS count FROM users');
    const [[items]] = await pool.query('SELECT COUNT(*) AS count FROM inventory');
    const [[available]] = await pool.query('SELECT COALESCE(SUM(available_qty), 0) AS total FROM inventory');
    const [[activeRes]] = await pool.query("SELECT COUNT(*) AS count FROM reservations WHERE status = 'active'");
    const [[pendingRes]] = await pool.query("SELECT COUNT(*) AS count FROM reservations WHERE status = 'pending'");
    const [[announcements]] = await pool.query('SELECT COUNT(*) AS count FROM announcements');

    res.json({
      totalUsers: users.count,
      totalItems: items.count,
      totalAvailable: available.total,
      activeReservations: activeRes.count,
      pendingReservations: pendingRes.count,
      totalAnnouncements: announcements.count,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/stats/faculty', async (req, res) => {
  try {
    const [[students]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'Student'");
    const [[todayClasses]] = await pool.query("SELECT COUNT(*) AS count FROM schedule WHERE day_of_week = 'Mon'");
    const [[unreadNotifs]] = await pool.query('SELECT COUNT(*) AS count FROM notifications WHERE is_read = FALSE');

    res.json({
      assignedStudents: students.count,
      todayClasses: todayClasses.count,
      unreadNotifications: unreadNotifs.count,
    });
  } catch (err) {
    console.error('Faculty stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/stats/cr', async (req, res) => {
  try {
    const [[announcements]] = await pool.query('SELECT COUNT(*) AS count FROM announcements');
    const [[notifs]] = await pool.query('SELECT COUNT(*) AS count FROM notifications');
    const [[available]] = await pool.query('SELECT COALESCE(SUM(available_qty), 0) AS total FROM inventory');

    res.json({
      totalAnnouncements: announcements.count,
      totalNotifications: notifs.count,
      itemsAvailable: available.total,
    });
  } catch (err) {
    console.error('CR stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
//  HELPER
// ═══════════════════════════════════════════

function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  SCMS API Server running on port ${PORT}    ║`);
  console.log(`  ║  http://localhost:${PORT}                   ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
