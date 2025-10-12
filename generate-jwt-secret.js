// Generate a secure JWT secret for production
import crypto from 'crypto';

const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('\n🔑 Generated JWT Secret:');
console.log(jwtSecret);
console.log('\n📋 Copy this value to Render environment variables');
console.log('Environment Variable: JWT_SECRET');
console.log('Value:', jwtSecret);