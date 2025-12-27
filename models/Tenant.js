const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
    },
    domain: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      maxStorageGB: {
        type: Number,
        default: 100,
      },
      maxVideoSizeMB: {
        type: Number,
        default: 500,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
tenantSchema.index({ domain: 1 });
tenantSchema.index({ isActive: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);

