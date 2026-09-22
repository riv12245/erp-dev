import mongoose from 'mongoose';
import { getCountryModel } from '../domain/country.model.js';

export interface CountryRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
}

/** Master data is global/shared (not tenant-scoped), so the repository is plain. */
export class CountryRepository {
  constructor(private readonly connection: mongoose.Connection) {}

  model() {
    return getCountryModel(this.connection);
  }

  async list(activeOnly = true): Promise<CountryRecord[]> {
    const docs = await this.model().find(activeOnly ? { isActive: true } : {}).sort({ name: 1 }).exec();
    return docs.map((doc) => ({
      id: String(doc._id),
      code: doc.code,
      name: doc.name,
      isActive: doc.isActive,
    }));
  }

  async getByCode(code: string): Promise<CountryRecord | null> {
    const doc = await this.model().findOne({ code }).exec();
    return doc ? { id: String(doc._id), code: doc.code, name: doc.name, isActive: doc.isActive } : null;
  }

  async upsert(input: { code: string; name: string; isActive?: boolean }): Promise<CountryRecord> {
    const doc = await this.model().findOneAndUpdate(
      { code: input.code },
      { $set: { code: input.code, name: input.name, isActive: input.isActive ?? true } },
      { new: true, upsert: true },
    ).exec();
    return { id: String(doc._id), code: doc.code, name: doc.name, isActive: doc.isActive };
  }
}