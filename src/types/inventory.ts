export type Item = {
  _id: string;
  name: string;
  unit: "kg" | "g" | "L" | "pcs";
  category?: string;
  unitCost: number;
  stockQty: number;
  reorderLevel: number;
};

export type Movement = {
  _id: string;
  itemId: string;
  type: "purchase" | "consume";
  qty: number;
  unitCost?: number;
  note?: string;
  date: string;
};
