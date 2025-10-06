import { Schema, model, models, Document } from "mongoose";

export interface IInventoryItem extends Document {
  name: string;
  unit: "kg" | "g" | "L" | "pcs";
  category?: string;
  unitCost: number;    // moving-average cost
  stockQty: number;    // on-hand qty
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true, trim: true, index: true },
    unit: { type: String, enum: ["kg", "g", "L", "pcs"], required: true, default: "kg" },
    category: { type: String, default: "" },
    unitCost: { type: Number, required: true, min: 0 },
    stockQty: { type: Number, required: true, min: 0 },
    reorderLevel: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export default models.InventoryItem || model<IInventoryItem>("InventoryItem", InventoryItemSchema);
