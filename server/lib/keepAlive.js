import cron from 'node-cron';

/**
 * Keep-alive service for Render free tier
 * Pings the health endpoint every 14 minutes to prevent auto-sleep
 */
export class KeepAliveService {
  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production';
    this.serverUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000';
    this.cronJob = null;
  }

  /**
   * Start the keep-alive cron job
   */
  start() {
    if (!this.isEnabled) {
      console.log('🔧 Keep-alive service disabled in development mode');
      return;
    }

    // Run every 14 minutes: '0 */14 * * * *'
    this.cronJob = cron.schedule('0 */14 * * * *', async () => {
      await this.ping();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.cronJob.start();
    console.log('⏰ Keep-alive service started - pinging every 14 minutes');
  }

  /**
   * Stop the keep-alive cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('⏰ Keep-alive service stopped');
    }
  }

  /**
   * Ping the health endpoint to keep server awake
   */
  async ping() {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.serverUrl}/api/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'KeepAlive-Service/1.0'
        }
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        console.log(`✅ Keep-alive ping successful (${duration}ms) - Server staying awake`);
      } else {
        console.log(`⚠️ Keep-alive ping returned ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Keep-alive ping failed:', error.message);
    }
  }

  /**
   * Manual ping for testing
   */
  async testPing() {
    console.log('🧪 Testing keep-alive ping...');
    await this.ping();
  }
}

export const keepAliveService = new KeepAliveService();