import mongoose from 'mongoose';

export interface SessionRecord {
  sessionId: string;
  userId: string;
  tenantId: string;
  authVersion: number;
  refreshHash: string;
  usedRefreshHashes: string[];
  generation: number;
  expiresAt: Date;
  purgeAt: Date;
  revokedAt?: Date;
  lastRotatedAt: Date;
}

const schema = new mongoose.Schema<SessionRecord>({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  tenantId: { type: String, required: true },
  authVersion: { type: Number, required: true },
  refreshHash: { type: String, required: true },
  usedRefreshHashes: { type: [String], default: [] },
  generation: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  purgeAt: { type: Date, required: true },
  revokedAt: Date,
  lastRotatedAt: { type: Date, required: true },
}, { collection: 'auth_sessions', timestamps: true });
schema.index({ userId: 1, tenantId: 1 });
schema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

/** Session secrets never cross this persistence boundary: only SHA-256 hashes. */
export class SessionRepository {
  private readonly model: mongoose.Model<SessionRecord>;
  constructor(connection: mongoose.Connection) {
    this.model = (connection.models.AuthSession as mongoose.Model<SessionRecord> | undefined)
      ?? connection.model<SessionRecord>('AuthSession', schema);
  }
  async create(record: SessionRecord): Promise<void> {
    await this.model.init();
    await this.model.create(record);
  }
  async find(sessionId: string): Promise<SessionRecord | null> {
    return this.model.findOne({ sessionId }).lean().exec();
  }
  async active(sessionId: string, userId: string, tenantId: string, authVersion: number): Promise<boolean> {
    return !!await this.model.exists({ sessionId, userId, tenantId, authVersion, revokedAt: null, expiresAt: { $gt: new Date() } });
  }
  async rotate(sessionId: string, refreshHash: string, nextHash: string): Promise<SessionRecord | null> {
    // The full used-hash history remains until absolute expiry; cap rotations to bound storage.
    return this.model.findOneAndUpdate({ sessionId, refreshHash, revokedAt: null, expiresAt: { $gt: new Date() }, generation: { $lt: 512 } }, {
      $set: { refreshHash: nextHash, lastRotatedAt: new Date() },
      $push: { usedRefreshHashes: refreshHash }, $inc: { generation: 1 },
    }, { new: true }).lean().exec();
  }
  async revoke(sessionId: string): Promise<void> {
    await this.model.updateOne({ sessionId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  async revokeOlderUserSessions(userId: string, authVersion: number): Promise<void> {
    await this.model.updateMany({ userId, authVersion: { $lt: authVersion }, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
}
