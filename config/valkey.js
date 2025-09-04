const { Redis } = require('iovalkey'); // Changed from 'valkey' to 'iovalkey'
require('dotenv').config();

class ValkeyClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new Redis({
        host: process.env.VALKEY_HOST || 'localhost',
        port: process.env.VALKEY_PORT || 6379,
        retryDelayOnFailover: 500,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.client.on('error', (err) => {
        console.error('Valkey Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to Valkey');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Reconnecting to Valkey...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('❌ Failed to connect to Valkey:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Valkey client not connected');
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('✅ Disconnected from Valkey');
    }
  }

  // Room-specific methods
  async setRoomData(roomId, data) {
    const client = this.getClient();
    await client.hset(`room:${roomId}`, data);
  }

  async getRoomData(roomId) {
    const client = this.getClient();
    return await client.hgetall(`room:${roomId}`);
  }

  async addUserToRoom(roomId, userId, userData) {
    const client = this.getClient();
    await client.hset(`room:${roomId}:users`, userId, JSON.stringify(userData));
  }

  async removeUserFromRoom(roomId, userId) {
    const client = this.getClient();
    await client.hdel(`room:${roomId}:users`, userId);
  }

  async getRoomUsers(roomId) {
    const client = this.getClient();
    const users = await client.hgetall(`room:${roomId}:users`);
    const parsedUsers = {};
    
    for (const [userId, userData] of Object.entries(users)) {
      try {
        parsedUsers[userId] = JSON.parse(userData);
      } catch (error) {
        console.error(`Error parsing user data for ${userId}:`, error);
      }
    }
    
    return parsedUsers;
  }

  async setRoomContent(roomId, content) {
    const client = this.getClient();
    await client.set(`room:${roomId}:content`, content);
  }

  async getRoomContent(roomId) {
    const client = this.getClient();
    return await client.get(`room:${roomId}:content`) || '';
  }

  async deleteRoom(roomId) {
    const client = this.getClient();
    const keys = await client.keys(`room:${roomId}*`);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }
}

// Create singleton instance
const valkeyClient = new ValkeyClient();

module.exports = valkeyClient;
