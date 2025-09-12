import { Schema, model, models, Document, Types } from "mongoose";

export interface IInventoryMovement extends Document {
  itemId: Types.ObjectId;
  type: "purchase" | "consume";
  qty: number;
  unitCost?: number;   // required for purchases
  note?: string;
  date: string;        // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
    type: { type: String, enum: ["purchase", "consume"], required: true },
    qty: { type: Number, required: true, min: 0.0001 },
    unitCost: { type: Number, min: 0 },
    note: String,
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true }
);

export default models.InventoryMovement || model<IInventoryMovement>("InventoryMovement", InventoryMovementSchema);
