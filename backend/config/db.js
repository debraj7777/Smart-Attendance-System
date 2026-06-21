import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

const connectDB = async () => {
  // Check if we should use local or Atlas MongoDB instead of In-Memory Server
  const useInMemory = process.env.USE_IN_MEMORY_DB !== 'false';

  if (!useInMemory && process.env.MONGO_URI) {
    console.log(`Connecting directly to MongoDB via MONGO_URI (${process.env.MONGO_URI})...`);
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MongoDB Connected successfully! (${conn.connection.host})`);
      return;
    } catch (error) {
      console.error(`❌ Error connecting to MongoDB: ${error.message}`);
      console.log('Falling back to In-Memory MongoDB attempt...');
    }
  }

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    const conn = await mongoose.connect(uri);
    console.log(`✅ In-Memory MongoDB Connected successfully! (${conn.connection.host})`);
  } catch (error) {
    console.error(`❌ Error connecting to In-Memory MongoDB: ${error.message}`);
    
    if (process.env.MONGO_URI) {
      console.log(`Trying fallback connection to MONGO_URI (${process.env.MONGO_URI})...`);
      try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ Connected to fallback MongoDB successfully! (${conn.connection.host})`);
      } catch (fallbackError) {
        console.error(`❌ Fallback MongoDB connection failed: ${fallbackError.message}`);
        console.error('Please ensure a local MongoDB service is running, or check your internet connection/Atlas URI.');
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;
