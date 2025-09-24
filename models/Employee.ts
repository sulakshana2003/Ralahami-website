import { Schema, model, models, Document } from "mongoose";

export interface IEmployee extends Document {
  // Basic Info
  name: string;
  role: string;
  employeeId: string;
  
  // Contact Information
  phone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  
  // Personal Details
  dateOfBirth: Date;
  
  // Employment Details
  department: string;
  hireDate: Date;
  employmentStatus: 'full-time' | 'part-time' | 'contract';
  payType: 'salary' | 'hourly';
  baseSalary: number; // monthly salary or hourly rate
  
  // Availability
  workingHours: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  shiftPreferences: string[];
  
  // Documents
  documents: {
    idCopy?: string; // file path or URL
    certifications?: string[];
    contract?: string;
  };
  
  // Status
  isActive: boolean;
}

const workingHoursSchema = {
  start: { type: String, default: "09:00" },
  end: { type: String, default: "17:00" },
  available: { type: Boolean, default: true }
};

const EmployeeSchema = new Schema<IEmployee>(
  {
    // Basic Info
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    
    // Contact Information
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true },
    emergencyContactName: { type: String, required: true, trim: true },
    emergencyContactPhone: { type: String, required: true, trim: true },
    
    // Personal Details
    dateOfBirth: { type: Date, required: true },
    
    // Employment Details
    department: { type: String, required: true, trim: true },
    hireDate: { type: Date, required: true },
    employmentStatus: { 
      type: String, 
      required: true, 
      enum: ['full-time', 'part-time', 'contract'],
      default: 'full-time'
    },
    payType: { 
      type: String, 
      required: true, 
      enum: ['salary', 'hourly'],
      default: 'salary'
    },
    baseSalary: { type: Number, required: true, min: 0 },
    
    // Availability
    workingHours: {
      monday: workingHoursSchema,
      tuesday: workingHoursSchema,
      wednesday: workingHoursSchema,
      thursday: workingHoursSchema,
      friday: workingHoursSchema,
      saturday: { ...workingHoursSchema, available: { type: Boolean, default: false } },
      sunday: { ...workingHoursSchema, available: { type: Boolean, default: false } }
    },
    shiftPreferences: [{ type: String, trim: true }],
    
    // Documents
    documents: {
      idCopy: { type: String, trim: true },
      certifications: [{ type: String, trim: true }],
      contract: { type: String, trim: true }
    },
    
    // Status
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default models.Employee || model<IEmployee>("Employee", EmployeeSchema);