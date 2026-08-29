const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./config/db');
const User = require('./models/User');
const seedDatabase = require('./utils/seedData');
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = require('./config/auth');

async function testAuth() {
  await connectDB();
  await seedDatabase();

  console.log('Testing User.findOne...');
  const user = await User.findOne({ email: 'staff@hospital.org' });
  console.log('Found user:', user ? { id: user._id, email: user.email, role: user.role } : null);

  if (!user) {
    console.error('ERROR: User not found!');
    return;
  }

  const isMatch = await user.comparePassword('staff123');
  console.log('Password comparison for staff123:', isMatch);

  const admin = await User.findOne({ email: 'admin@hospital.org' });
  console.log('Found admin:', admin ? { id: admin._id, email: admin.email } : null);
  const adminMatch = admin ? await admin.comparePassword('admin123') : false;
  console.log('Password comparison for admin123:', adminMatch);

  const doctor = await User.findOne({ email: 'doctor@hospital.org' });
  console.log('Found doctor:', doctor ? { id: doctor._id, email: doctor.email } : null);
  const doctorMatch = doctor ? await doctor.comparePassword('doctor123') : false;
  console.log('Password comparison for doctor123:', doctorMatch);
}

testAuth().then(() => console.log('Test completed.')).catch(err => console.error('Test error:', err));
