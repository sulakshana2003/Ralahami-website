// /models/Reservation.ts
import { Schema, model, models, Document, Types } from "mongoose";

export type ReservationStatus = "confirmed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "unpaid";
export type PaymentMethod = "cash" | "card" | "online";

export interface IReservation extends Document {
  userId?: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  date: string;
  slot: string;
  partySize: number;
  notes?: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String },
    date: { type: String, required: true, index: true }, // yyyy-mm-dd
    slot: { type: String, required: true, index: true }, // HH:mm
    partySize: { type: Number, required: true, min: 1, max: 100 },
    notes: { type: String },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "unpaid"],
      default: "pending",
    },
    paymentMethod: { type: String, enum: ["cash", "card", "online"] },
    amount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ReservationSchema.index({ date: 1, slot: 1, status: 1 });

export default models.Reservation ||
  model<IReservation>("Reservation", ReservationSchema);