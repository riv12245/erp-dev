import mongoose from 'mongoose';

export interface UserAttributes {
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly status: 'active' | 'suspended' | 'locked';
  readonly failedLoginAttempts: number;
  readonly lockedUntil?: Date;
  readonly lastLoginAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const userSchema = new mongoose.Schema<UserAttributes>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    status: { type: String, enum: ['active', 'suspended', 'locked'], default: 'active' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, collection: 'users' },
);

export interface UserDocument extends mongoose.Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended' | 'locked';
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
}

export function getUserModel(connection: mongoose.Connection): mongoose.Model<UserDocument> {
  return (connection.models.User as unknown as mongoose.Model<UserDocument>) ?? (connection.model('User', userSchema) as unknown as mongoose.Model<UserDocument>);
}