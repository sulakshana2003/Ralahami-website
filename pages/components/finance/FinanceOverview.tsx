/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FiTrendingUp, FiDollarSign, FiPackage } from "react-icons/fi";

interface Product {
  _id: string;
  name: string;
  price: number;
  promotion?: number;
  finalPrice?: number;
  category?: string;
  isAvailable: boolean;
  createdAt: string;
}

export default function FinanceOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await axios.get("/api/products");
        const data = res.data || [];
        setProducts(data);

        const totalPrice = data.reduce(
          (acc: number, p: Product) => acc + (p.finalPrice ?? p.price),
          0
        );
        const discount = data.reduce(
          (acc: number, p: Product) => acc + (p.promotion ?? 0),
          0
        );

        setTotalProducts(data.length);
        setTotalRevenue(totalPrice);
        setTotalDiscount(discount);
      } catch (err) {
        console.error("❌ Failed to fetch products", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-emerald-600">
        Loading finance data...
      </div>
    );
  }

  return (
    <section className="p-6 space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800">Finance Overview</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 bg-white border rounded-xl shadow-sm flex flex-col items-start">
          <FiDollarSign className="text-2xl text-emerald-600 mb-2" />
          <p className="text-sm text-gray-500">Total Revenue (Base)</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm flex flex-col items-start">
          <FiTrendingUp className="text-2xl text-rose-500 mb-2" />
          <p className="text-sm text-gray-500">Total Discounts</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {totalDiscount.toLocaleString()}
          </p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm flex flex-col items-start">
          <FiPackage className="text-2xl text-blue-500 mb-2" />
          <p className="text-sm text-gray-500">Products Count</p>
          <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
        </div>
      </div>

      {/* Simple Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="bg-emerald-50 text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Base Price</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Final Price</th>
              <th className="px-4 py-3">Available</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.category || "—"}</td>
                <td className="px-4 py-3">LKR {p.price.toLocaleString()}</td>
                <td className="px-4 py-3">LKR {p.promotion?.toLocaleString() || 0}</td>
                <td className="px-4 py-3">
                  LKR {(p.finalPrice ?? p.price - (p.promotion ?? 0)).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      p.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {p.isAvailable ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
