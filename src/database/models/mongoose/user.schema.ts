/**
 * Mongoose User Schema
 * MongoDB schema for User entity
 */

import { Schema, model, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User interface for Mongoose
 */
export interface IUserDocument extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * User Schema
 */
const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'moderator', 'admin', 'super_admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'user',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'suspended', 'pending'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
    collection: 'users',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret): Record<string, unknown> => {
        const id = ret._id.toString();
        const { password, _id: mongoId, __v, ...rest } = ret;
        void password; // Intentionally excluded from output
        void mongoId;
        void __v;
        return { id, ...rest };
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret): Record<string, unknown> => {
        const { _id, ...rest } = ret;
        return { id: _id.toString(), ...rest };
      },
    },
  }
);

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Method to compare password
 */
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch {
    return false;
  }
};

/**
 * Indexes for better query performance
 * Note: email index is already defined via unique: true in schema
 * role and status indexes are defined via index: true in schema
 */
userSchema.index({ role: 1, status: 1 }); // Compound index for filtering
userSchema.index({ createdAt: -1 }); // For sorting by creation date

/**
 * User Model
 */
export const UserModel = model<IUserDocument>('User', userSchema);
