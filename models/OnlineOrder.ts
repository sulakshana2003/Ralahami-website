// models/OnlineOrder.ts
import { Schema, model, models, Document } from "mongoose";

export interface IOnlineOrder extends Document {
  date: string; // YYYY-MM-DD
  orderId?: string;
  revenue: number;
  cost: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OnlineOrderSchema = new Schema<IOnlineOrder>(
  {
    date: { type: String, required: true, index: true },
    orderId: { type: String },
    revenue: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    note: { type: String },
  },
  { timestamps: true }
);

export default models.OnlineOrder ||
  model<IOnlineOrder>("OnlineOrder", OnlineOrderSchema);
