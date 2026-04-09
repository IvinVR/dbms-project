-- ═══════════════════════════════════════════
--  SCMS — SmartCampus Management System
--  Database Schema & Seed Data
-- ═══════════════════════════════════════════

-- Create the database
CREATE DATABASE IF NOT EXISTS scms_db;
USE defaultdb;

-- ═══════════════════════════════════════════
--  TABLE DEFINITIONS
-- ═══════════════════════════════════════════

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL DEFAULT 'campus123',
    role ENUM('Student', 'Faculty', 'Admin', 'Sub-Admin') NOT NULL DEFAULT 'Student',
    batch VARCHAR(20) DEFAULT '—',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📦',
    category ENUM('AV', 'IT', 'Stationery', 'Electrical', 'Other') NOT NULL,
    total_qty INT NOT NULL DEFAULT 1,
    available_qty INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    status ENUM('active', 'pending', 'expired') NOT NULL DEFAULT 'active',
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    icon VARCHAR(10) DEFAULT '🔔',
    icon_bg VARCHAR(100) DEFAULT '',
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    created_by INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    type ENUM('default', 'urgent', 'info') NOT NULL DEFAULT 'default',
    target_audience VARCHAR(100) DEFAULT 'All',
    author_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Schedule table
CREATE TABLE IF NOT EXISTS schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT,
    day_of_week ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri') NOT NULL,
    time_slot TIME NOT NULL,
    subject VARCHAR(100) NOT NULL,
    room VARCHAR(50) NOT NULL,
    color_class VARCHAR(30) DEFAULT 'sch-event-green',
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════
--  SEED DATA
-- ═══════════════════════════════════════════

INSERT INTO users (name, email, password, role, batch, status) VALUES
('Alex Johnson',    'alex.johnson@campus.edu', 'student123', 'Student',   '2023-27', 'active'),
('Priya Menon',     'priya.m@campus.edu',      'student123', 'Student',   '2023-27', 'active'),
('Rahul Sharma',    'rahul.s@campus.edu',      'student123', 'Student',   '2022-26', 'active'),
('Emily Davis',     'emily.d@campus.edu',      'student123', 'Student',   '2024-28', 'active'),
('Prof. Smith',     'prof.smith@campus.edu',   'faculty123', 'Faculty',   '-',       'active'),
('Dr. Ananya Iyer', 'ananya.i@campus.edu',     'faculty123', 'Faculty',   '-',       'active'),
('Admin',           'admin@campus.edu',        'admin123',   'Admin',     '-',       'active'),
('CR Batch 23',     'cr.batch23@campus.edu',   'cr1234',     'Sub-Admin', '2023-27', 'active'),
('Suresh Kumar',    'suresh.k@campus.edu',     'student123', 'Student',   '2023-27', 'inactive'),
('Maria Gonzalez',  'maria.g@campus.edu',      'student123', 'Student',   '2022-26', 'active');

INSERT INTO inventory (name, icon, category, total_qty, available_qty) VALUES
('LCD Projector',      '📽️', 'AV',         12,  5),
('Wireless Mic',       '🎤', 'AV',         20,  14),
('Laptop (Dell)',      '💻', 'IT',         30,  8),
('HDMI Cable',         '🔌', 'IT',         50,  42),
('Whiteboard Marker',  '✏️', 'Stationery', 200, 135),
('Extension Board',    '🔋', 'Electrical', 25,  10),
('Webcam (Logitech)',  '📷', 'IT',         15,  11),
('Portable Speaker',   '🔊', 'AV',         10,  3),
('USB Drive 64GB',     '💾', 'IT',         40,  28),
('Laser Pointer',      '🔴', 'Other',      18,  15),
('Chart Paper (pack)', '📄', 'Stationery', 100, 72),
('LED Panel Light',    '💡', 'Electrical', 8,   2);

INSERT INTO reservations (user_id, item_id, qty, status, due_date) VALUES
(1, 1, 1, 'active',  '2026-04-15'),
(2, 3, 2, 'active',  '2026-04-12'),
(3, 2, 1, 'pending', '2026-04-18'),
(1, 6, 1, 'expired', '2026-04-01'),
(4, 8, 1, 'active',  '2026-04-20'),
(3, 9, 3, 'active',  '2026-04-14');

INSERT INTO notifications (icon, icon_bg, title, description, is_read) VALUES
('📦', 'background:var(--accent-lt);color:var(--accent)',       'Reservation Approved',  'Your LCD Projector reservation is confirmed.',    FALSE),
('📢', 'background:var(--warn-lt);color:var(--warn)',           'New Announcement',      'Mid-semester exam schedule released.',             FALSE),
('🔧', 'background:var(--accent-2-lt);color:var(--accent-2)',   'Maintenance Notice',    'Lab 4 will be closed for maintenance on Apr 10.', TRUE),
('🎓', 'background:var(--accent-lt);color:var(--accent)',       'Workshop Registration', 'AI/ML Workshop - Register by Apr 12.',            FALSE),
('⚠️', 'background:var(--danger-lt);color:var(--danger)',       'Overdue Return',        'Extension Board return is overdue by 7 days.',    TRUE),
('📋', 'background:#E8F0FE;color:#1A73E8',                      'Schedule Updated',      'Prof. Smith updated Thursday schedule.',           TRUE);

INSERT INTO announcements (title, body, type, target_audience, author_id) VALUES
('Mid-Semester Examination Schedule', 'The mid-semester exams will begin from April 14th. Please check the exam portal for your individual timetable and room assignments.', 'urgent',  'All Students', 7),
('Library Extended Hours',            'The campus library will remain open until 10 PM during exam season (Apr 10-25). ID card is mandatory for entry after 6 PM.',           'info',    'All',          7),
('Sports Day Volunteer Registration', 'Annual Sports Day is scheduled for April 28th. Students interested in volunteering can register at the Sports Office by Apr 15.',      'default', 'Batch 2023',   8),
('Campus Wi-Fi Maintenance',          'Wi-Fi maintenance scheduled for Apr 9 from 2 AM to 6 AM. Save your work.',                                                            'urgent',  'All',          7),
('Guest Lecture: Blockchain',         'Guest lecture on Blockchain Applications in Education - Auditorium A, Apr 11 at 3 PM.',                                                'info',    'CS Students',  5);

INSERT INTO schedule (faculty_id, day_of_week, time_slot, subject, room, color_class) VALUES
(5, 'Mon', '09:00:00', 'Data Structures',       'Room 301', 'sch-event-green'),
(5, 'Mon', '11:00:00', 'Database Management',    'Room 204', 'sch-event-blue'),
(5, 'Mon', '14:00:00', 'OS Lab',                'Lab 2',    'sch-event-amber'),
(5, 'Tue', '08:00:00', 'Discrete Mathematics',   'Room 102', 'sch-event-rose'),
(5, 'Tue', '10:00:00', 'Computer Networks',      'Room 301', 'sch-event-green'),
(5, 'Tue', '13:00:00', 'Software Engineering',   'Room 204', 'sch-event-blue'),
(5, 'Wed', '09:00:00', 'Data Structures',        'Room 301', 'sch-event-green'),
(5, 'Wed', '11:00:00', 'Database Management Lab','Lab 3',    'sch-event-amber'),
(5, 'Wed', '15:00:00', 'Seminar',               'Audi A',   'sch-event-rose'),
(5, 'Thu', '08:00:00', 'Discrete Mathematics',   'Room 102', 'sch-event-rose'),
(5, 'Thu', '10:00:00', 'Computer Networks',      'Room 301', 'sch-event-green'),
(5, 'Thu', '14:00:00', 'Project Work',           'Lab 1',    'sch-event-blue'),
(5, 'Fri', '09:00:00', 'Software Engineering',   'Room 204', 'sch-event-blue'),
(5, 'Fri', '11:00:00', 'OS Lecture',            'Room 301', 'sch-event-amber'),
(5, 'Fri', '13:00:00', 'Sports / Free',         'Ground',   'sch-event-green');
