const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('../models/User');

dotenv.config();

const resetSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('superadmin123', salt);

    const result = await User.findOneAndUpdate(
      { role: 'superAdmin' },
      { email: 'admin@sportek.com', passwordHash, name: 'System Admin', isBanned: false },
      { upsert: true, new: true }
    );

    console.log(`Super admin ready: admin@sportek.com / superadmin123 (id: ${result._id})`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetSuperAdmin();
