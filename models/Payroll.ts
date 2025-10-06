import { Schema, model, models, Document, Types } from "mongoose";

export type PayrollType = "salary" | "advance" | "bonus" | "deduction";

export interface IPayroll extends Document {
  employeeId: Types.ObjectId;
  type: PayrollType;
  amount: number;     // positive number; 'deduction' reduces outflow in summaries
  date: string;       // YYYY-MM-DD
  note?: string;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    type: { type: String, enum: ["salary", "advance", "bonus", "deduction"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    note: { type: String },
  },
  { timestamps: true }
);

export default models.Payroll || model<IPayroll>("Payroll", PayrollSchema);
