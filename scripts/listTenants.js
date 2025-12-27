/**
 * Helper script to list all tenants
 * Usage: node scripts/listTenants.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('\n❌ Error: MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected\n');
  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const listTenants = async () => {
  await connectDB();

  try {
    const tenants = await Tenant.find({}).sort({ createdAt: -1 });

    if (tenants.length === 0) {
      console.log('No tenants found. Create one with:');
      console.log('node scripts/createTenant.js "Company Name" "domain"\n');
      process.exit(0);
    }

    console.log('📋 Existing Tenants:');
    console.log('===================\n');

    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   ID: ${tenant._id}`);
      console.log(`   Domain: ${tenant.domain || 'N/A'}`);
      console.log(`   Status: ${tenant.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Created: ${tenant.createdAt.toLocaleString()}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error listing tenants:', error.message);
    process.exit(1);
  }
};

listTenants();

