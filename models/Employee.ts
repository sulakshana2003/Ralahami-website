import { Schema, model, models, Document } from "mongoose";

export interface IEmployee extends Document {
  name: string;
  role: string;
  baseSalary: number; // monthly
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    baseSalary: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export default models.Employee || model<IEmployee>("Employee", EmployeeSchema);
