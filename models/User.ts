/* import { Schema, model, models, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: 'user' | 'admin'
  phone?: string
  address?: string
  loyaltyPoints: number
  isActive: boolean; 
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    phone: String,
    address: String,
    loyaltyPoints: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)



export default models.User || model<IUser>('User', UserSchema)
 */



// import { Schema, model, models, Document } from 'mongoose'

// export interface IUser extends Document {
//   name: string
//   email: string
//   passwordHash: string
//   role: 'user' | 'admin'
//   phone: string
//   address: string
// }

// const UserSchema = new Schema<IUser>(
//   {
//     name: { type: String, required: true, trim: true },
//     email: { type: String, required: true, unique: true, lowercase: true },
//     passwordHash: { type: String, required: true },
//     role: { type: String, enum: ['user', 'admin'], default: 'user' },
//     phone: {
//       type: String,
//       required: true,
//       match: [/^\+94\s7\d{8}$/, 'Phone number must be in +94 7XXXXXXXX format'],
//     },
//     address: { type: String, required: true },
//   },
//   { timestamps: true }
// )

// export default models.User || model<IUser>('User', UserSchema)

// import { Schema, model, models, Document } from 'mongoose'

// export interface IUser extends Document {
//   name: string
//   email: string
//   passwordHash: string
//   role: 'user' | 'admin'
//   phone?: string
//   address?: string
//   loyaltyPoints: number
//   isActive: boolean
// }

// const UserSchema = new Schema<IUser>(
//   {
//     name: { type: String, required: true, trim: true },
//     email: { type: String, required: true, unique: true, lowercase: true },
//     passwordHash: { type: String, required: true },
//     role: { type: String, enum: ['user', 'admin'], default: 'user' },

//     // optional fields (validated if provided)
//     phone: {
//       type: String,
//       match: [/^\+94\s7\d{8}$/, 'Phone number must be in +94 7XXXXXXXX format'],
//     },
//     address: String,

//     loyaltyPoints: { type: Number, default: 0 },

//     // ✅ critical for Block/Activate
//     isActive: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// )

// export default models.User || model<IUser>('User', UserSchema)



import { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  phone?: string;
  address?: string;
  loyaltyPoints: number;
  isActive: boolean;
  resetToken?: string;        // ✅ added
  resetTokenExpiry?: Date;    // ✅ added
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    phone: {
      type: String,
      match: [/^\+94\s7\d{8}$/, 'Phone number must be in +94 7XXXXXXXX format'],
    },
    address: String,
    loyaltyPoints: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // ✅ new fields used by reset flow
    resetToken: { type: String, index: true },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

export default models.User || model<IUser>('User', UserSchema);


