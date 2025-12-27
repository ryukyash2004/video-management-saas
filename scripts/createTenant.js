/**
 * Helper script to create a tenant
 * Usage: node scripts/createTenant.js "Tenant Name" "domain"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('\n❌ Error: MONGODB_URI not found in environment variables');
      console.error('Please create a .env file with MONGODB_URI=mongodb://localhost:27017/video-management-saas');
      console.error('Or set it to your MongoDB Atlas connection string\n');
      process.exit(1);
    }

    console.log(`Connecting to MongoDB: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***@')}...`);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure MongoDB is running locally: mongod');
    console.error('2. Or use MongoDB Atlas and update MONGODB_URI in .env');
    console.error('3. Check your .env file exists and has MONGODB_URI set\n');
    process.exit(1);
  }
};

const createTenant = async () => {
  await connectDB();

  const name = process.argv[2] || 'Default Tenant';
  const domain = process.argv[3] || null;

  try {
    const tenant = await Tenant.create({
      name,
      domain,
      isActive: true,
      settings: {
        maxStorageGB: 100,
        maxVideoSizeMB: 500,
      },
    });

    console.log('\n✅ Tenant created successfully!');
    console.log('\nTenant Details:');
    console.log('================');
    console.log(`ID: ${tenant._id}`);
    console.log(`Name: ${tenant.name}`);
    console.log(`Domain: ${tenant.domain || 'N/A'}`);
    console.log(`\nUse this Tenant ID when registering users:\n${tenant._id}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating tenant:', error.message);
    process.exit(1);
  }
};

createTenant();

