// Test script for keep-alive service
import { keepAliveService } from './lib/keepAlive.js';

console.log('🧪 Testing Keep-Alive Service...');

// Override for testing
keepAliveService.isEnabled = true;
keepAliveService.serverUrl = 'http://localhost:4000';

// Test a manual ping
await keepAliveService.testPing();

console.log('✅ Keep-alive test completed');
process.exit(0);