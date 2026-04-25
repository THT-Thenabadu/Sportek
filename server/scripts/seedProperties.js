const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Property = require('../models/Property');

dotenv.config();

const seedProperties = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding Properties');

    const existingCount = await Property.countDocuments();
    if (existingCount > 0) {
      console.log('Properties already exist, skipping seed.');
      return;
    }

    // Find the property owner to use
    let owner = await User.findOne({ email: 'owner@sportek.com' });
    if (!owner) {
      // Fallback to any property owner or super admin
      owner = await User.findOne({ role: 'propertyOwner' }) || await User.findOne({ role: 'superAdmin' });
    }

    if (!owner) {
      console.error('No suitable owner user found. Run npm run seed:admin first.');
      process.exit(1);
    }
    console.log(`Assigning properties to owner: ${owner.email} (${owner.role})`);

    const properties = [
      {
        ownerId: owner._id,
        name: 'Elite Football Arena',
        sportType: 'Football',
        description: 'A full-size FIFA-standard football pitch with flood lighting, professional grass, and changing rooms.',
        images: ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop'],
        pricePerHour: 80,
        location: { address: '12 Stadium Drive, Colombo 07', lat: 6.9271, lng: 79.8612 },
        availableHours: { start: '06:00', end: '22:00' },
        slotDurationMinutes: 60,
        isActive: true,
        averageRating: 4.8,
      },
      {
        ownerId: owner._id,
        name: 'Pro Tennis Club',
        sportType: 'Tennis',
        description: 'Two hard-court tennis courts with ball machines, coaching available, and on-site cafe.',
        images: ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&auto=format&fit=crop'],
        pricePerHour: 45,
        location: { address: '5 Racquet Lane, Colombo 03', lat: 6.9101, lng: 79.8553 },
        availableHours: { start: '07:00', end: '21:00' },
        slotDurationMinutes: 60,
        isActive: true,
        averageRating: 4.6,
      },
      {
        ownerId: owner._id,
        name: 'Smash Badminton Hall',
        sportType: 'Badminton',
        description: 'Four indoor badminton courts with wooden flooring, shuttle hire included, and air conditioning.',
        images: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop'],
        pricePerHour: 30,
        location: { address: '88 Sports Complex Rd, Nugegoda', lat: 6.8726, lng: 79.8878 },
        availableHours: { start: '06:00', end: '23:00' },
        slotDurationMinutes: 60,
        isActive: true,
        averageRating: 4.9,
      },
      {
        ownerId: owner._id,
        name: 'Aqua Swim Centre',
        sportType: 'Swimming',
        description: 'Olympic-length 50m pool with lane booking, heated water year-round, and certified lifeguards.',
        images: ['https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=800&auto=format&fit=crop'],
        pricePerHour: 25,
        location: { address: '3 Pool Avenue, Dehiwala', lat: 6.8495, lng: 79.8644 },
        availableHours: { start: '05:30', end: '20:00' },
        slotDurationMinutes: 60,
        isActive: true,
        averageRating: 4.7,
      },
      {
        ownerId: owner._id,
        name: 'BasketZone Indoor Court',
        sportType: 'Basketball',
        description: 'Full NBA-size indoor basketball court, scoreboard, and equipment rental available.',
        images: ['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop'],
        pricePerHour: 60,
        location: { address: '22 Hoops Street, Mount Lavinia', lat: 6.8399, lng: 79.8661 },
        availableHours: { start: '08:00', end: '22:00' },
        slotDurationMinutes: 60,
        isActive: true,
        averageRating: 4.5,
      },
      {
        ownerId: owner._id,
        name: 'CricketHub Ground',
        sportType: 'Cricket',
        description: 'Regulation cricket ground with wicket preparation, nets practice area, and pavilion.',
        images: ['https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop'],
        pricePerHour: 100,
        location: { address: '9 Boundary Road, Moratuwa', lat: 6.7730, lng: 79.8831 },
        availableHours: { start: '06:00', end: '18:00' },
        slotDurationMinutes: 120,
        isActive: true,
        averageRating: 4.7,
      },
    ];

    await Property.insertMany(properties);
    console.log(`✓ ${properties.length} properties seeded successfully!`);
    process.exit(0);

  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedProperties();
