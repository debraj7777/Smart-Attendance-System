import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

const connectDB = async () => {
  /**
   * Connection priority:
   *  1. MONGO_URI env var is set → always use it (Atlas or local)
   *  2. USE_IN_MEMORY_DB=true → in-memory (for local dev / tests with no Atlas)
   *  3. Neither set → exit with a clear error message
   */
  if (process.env.MONGO_URI) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection failed: ${error.message}`);
      process.exit(1);
    }
  }

  if (process.env.USE_IN_MEMORY_DB === 'true') {
    try {
      mongoServer = await MongoMemoryServer.create();
      const uri   = mongoServer.getUri();
      const conn  = await mongoose.connect(uri);
      console.log(`⚠️  In-Memory MongoDB connected (data lost on restart): ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`❌ In-Memory MongoDB failed: ${error.message}`);
      process.exit(1);
    }
  }

  console.error(
    '❌ No database configured.\n' +
    '   Set MONGO_URI in your .env for persistent storage (Atlas or local),\n' +
    '   or set USE_IN_MEMORY_DB=true for a temporary in-memory instance (dev/test only).'
  );
  process.exit(1);
};

export default connectDB;
