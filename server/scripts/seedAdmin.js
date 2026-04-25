const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('../models/User');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding');

    const superAdminExists = await User.findOne({ role: 'superAdmin' });
    if (superAdminExists) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('superadmin123', salt);

    const superAdmin = new User({
      name: 'System Admin',
      email: 'admin@sportek.com',
      passwordHash,
      role: 'superAdmin'
    });
    await superAdmin.save();
    console.log('Super admin created: admin@sportek.com / superadmin123');

    // Also seed a test propertyOwner
    const ownerPassword = await bcrypt.hash('owner123', salt);
    const testOwner = new User({
      name: 'Test Owner',
      email: 'owner@sportek.com',
      passwordHash: ownerPassword,
      role: 'propertyOwner'
    });
    await testOwner.save();
    console.log('Test owner created: owner@sportek.com / owner123');

    process.exit(0);

  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
