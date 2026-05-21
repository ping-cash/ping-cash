// Initialize MongoDB for local development
// This script runs automatically when the container starts

db = db.getSiblingDB('cash');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['phoneHash', 'createdAt'],
      properties: {
        phoneHash: { bsonType: 'string' },
        phone: { bsonType: 'string' },
        name: { bsonType: 'string' },
        email: { bsonType: 'string' },
        kycStatus: { enum: ['none', 'pending', 'verified', 'rejected'] },
        kycTier: { bsonType: 'int' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.createCollection('claims');
db.createCollection('notifications');

// Create indexes
db.users.createIndex({ phoneHash: 1 }, { unique: true });
db.users.createIndex({ 'wallet.address': 1 });
db.users.createIndex({ email: 1 }, { sparse: true });

db.claims.createIndex({ code: 1 }, { unique: true });
db.claims.createIndex({ transferId: 1 });
db.claims.createIndex({ recipientPhoneHash: 1 });
db.claims.createIndex({ status: 1 });
db.claims.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ phone: 1 });
db.notifications.createIndex({ status: 1 });
db.notifications.createIndex({ createdAt: -1 });

print('MongoDB initialized successfully for Ping platform');
