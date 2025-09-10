export type Product = {
  _id: string;
  name: string;
  price: number;
  slug: string;
  image?: string;        // first image URL if you have one
  stock?: number;        // optional
};

export type CartItem = Product & { qty: number };
