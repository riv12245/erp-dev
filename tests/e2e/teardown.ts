import mongoose from 'mongoose';

export async function teardown(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('E2E teardown: MongoDB disconnected');
  } catch (error) {
    console.error('E2E teardown error:', error);
  }
}
