import mongoose from 'mongoose';
import { CountryRepository, CountryRecord } from '../infrastructure/country.repository.js';

export class MasterDataService {
  constructor(private readonly connection: mongoose.Connection) {}

  async listCountries(activeOnly = true): Promise<CountryRecord[]> {
    return new CountryRepository(this.connection).list(activeOnly);
  }

  async upsertCountry(input: { code: string; name: string; isActive?: boolean }): Promise<CountryRecord> {
    return new CountryRepository(this.connection).upsert(input);
  }
}