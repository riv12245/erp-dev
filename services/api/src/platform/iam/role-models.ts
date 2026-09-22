import mongoose from 'mongoose';

export interface PermissionAttributes {
  readonly name: string;
  readonly description?: string;
  readonly module: string;
}

export const permissionSchema = new mongoose.Schema<PermissionAttributes>(
  {
    name: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    module: { type: String, required: true },
  },
  { timestamps: true, collection: 'permissions' },
);

export interface PermissionDocument extends mongoose.Document, PermissionAttributes {}

export function getPermissionModel(connection: mongoose.Connection): mongoose.Model<PermissionDocument> {
  return (
    (connection.models.Permission as unknown as mongoose.Model<PermissionDocument>) ??
    (connection.model('Permission', permissionSchema) as unknown as mongoose.Model<PermissionDocument>)
  );
}

export interface RoleAttributes {
  readonly name: string;
  readonly tenantId?: string;
  readonly permissions: readonly string[];
  readonly isSystem: boolean;
  readonly description?: string;
}

export const roleSchema = new mongoose.Schema<RoleAttributes>(
  {
    name: { type: String, required: true },
    tenantId: { type: String, index: true },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    description: { type: String },
  },
  { timestamps: true, collection: 'roles' },
);

roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export interface RoleDocument extends mongoose.Document, RoleAttributes {}

export function getRoleModel(connection: mongoose.Connection): mongoose.Model<RoleDocument> {
  return (connection.models.Role as unknown as mongoose.Model<RoleDocument>) ?? (connection.model('Role', roleSchema) as unknown as mongoose.Model<RoleDocument>);
}