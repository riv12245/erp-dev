import mongoose from 'mongoose';

export interface CountryAttributes {
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
}

export const countrySchema = new mongoose.Schema<CountryAttributes>(
  {
    code: { type: String, required: true, unique: true, index: true, uppercase: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'master_countries' },
);

export interface CountryDocument extends mongoose.Document, CountryAttributes {}

export function getCountryModel(connection: mongoose.Connection): mongoose.Model<CountryDocument> {
  return (
    (connection.models.Country as unknown as mongoose.Model<CountryDocument>) ??
    (connection.model('Country', countrySchema) as unknown as mongoose.Model<CountryDocument>)
  );
}