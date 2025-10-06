export type ProductItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  price: number;
  promotion: number;
  category: string | null;
  spicyLevel: number;
  isAvailable: boolean;
  stock: number;
  isSignatureToday: boolean;
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
  finalPrice: number;
};

export type CartItem = {
  id: string;          // ProductItem.id
  name: string;
  slug: string;
  image?: string;
  unitPrice: number;   // price after promotion
  qty: number;
};
