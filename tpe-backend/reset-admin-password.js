const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    const db = await open({
      filename: './power100.db',
      driver: sqlite3.Database
    });

    console.log('🔐 Resetting admin password...\n');

    // Hash the new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update admin password
    await db.run(
      'UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
      [hashedPassword, 'admin@power100.io']
    );

    console.log('✅ Admin password reset successfully!');
    console.log('📧 Email: admin@power100.io');
    console.log('🔑 Password: admin123');
    console.log('\nYou can now log in to the admin dashboard.');

    await db.close();
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  }
}

resetAdminPassword();