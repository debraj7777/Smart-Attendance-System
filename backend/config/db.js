import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

const connectDB = async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    const conn = await mongoose.connect(uri);
    console.log(`✅ In-Memory MongoDB Connected successfully! (${conn.connection.host})`);
  } catch (error) {
    console.error(`❌ Error connecting to In-Memory MongoDB: ${error.message}`);
    process.exit(1); 
  }
};

export default connectDB;
