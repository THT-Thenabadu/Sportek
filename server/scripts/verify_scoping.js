const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
const User = require('../models/User');

// Override DNS resolution to use Google's Public DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

const main = async () => {
  try {
    const BASE_URL = 'http://localhost:5000/api';
    dotenv.config();
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });

    const createOwner = async (name, email) => {
      console.log(`Registering ${name}...`);
      const regRes = await fetch(`${BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password: 'password123',
          phone: '1234567890'
        })
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.message || 'Registration failed');
      
      await User.findByIdAndUpdate(regData._id, { role: 'propertyOwner', institution: `${name} Inst` });
      console.log(`${name} promoted to propertyOwner.`);
      return regData.token;
    };

    // 1. Create Owner A and Owner B
    const tokenA = await createOwner('Owner A', `owner_a_${Date.now()}@example.com`);
    const tokenB = await createOwner('Owner B', `owner_b_${Date.now()}@example.com`);

    // 2. Owner A adds Property A
    console.log('Owner A adding property...');
    const addResA = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Property A',
        sportType: 'Football',
        description: 'Owner A pitch',
        pricePerHour: 50,
        location: { address: 'Address A' },
        availableHours: { start: '06:00', end: '22:00' },
        slotDurationMinutes: 60,
        institution: 'Institution A'
      })
    });
    const dataA = await addResA.json();
    console.log(`Property A added with institution: ${dataA.institution}`);

    // 3. Owner B adds Property B
    console.log('Owner B adding property...');
    const addResB = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        name: 'Property B',
        sportType: 'Tennis',
        description: 'Owner B court',
        pricePerHour: 40,
        location: { address: 'Address B' },
        availableHours: { start: '07:00', end: '21:00' },
        slotDurationMinutes: 60,
        institution: 'Institution B'
      })
    });
    const dataB = await addResB.json();
    console.log(`Property B added with institution: ${dataB.institution}`);

    // 4. Owner A fetches my-properties
    console.log('Owner A fetching properties...');
    const resMyA = await fetch(`${BASE_URL}/properties/my-properties`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const myA = await resMyA.json();
    console.log(`Owner A found ${myA.length} properties.`);
    if (myA.length !== 1 || myA[0].name !== 'Property A') {
      throw new Error('Owner A should only see Property A!');
    }

    // 5. Owner B fetches my-properties
    console.log('Owner B fetching properties...');
    const resMyB = await fetch(`${BASE_URL}/properties/my-properties`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const myB = await resMyB.json();
    console.log(`Owner B found ${myB.length} properties.`);
    if (myB.length !== 1 || myB[0].name !== 'Property B') {
      throw new Error('Owner B should only see Property B!');
    }

    // 6. Fetch public properties
    console.log('Fetching public properties...');
    const resPub = await fetch(`${BASE_URL}/properties`);
    const pub = await resPub.json();
    console.log(`Found ${pub.length} public properties.`);
    
    const names = pub.map(p => p.name);
    if (!names.includes('Property A') || !names.includes('Property B')) {
      throw new Error('Public properties should contain both Property A and Property B!');
    }

    console.log('ALL VERIFICATION STEPS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err.message);
    process.exit(1);
  }
};

main();
