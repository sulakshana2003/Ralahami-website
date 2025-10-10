/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import Modal from "react-modal";

Modal.setAppElement("body");

interface Promotion {
  _id?: string;
  title: string;
  desc: string;
  cta: string;
  link: string;
  image: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export default function PromotionManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  const emptyForm: Promotion = {
    title: "",
    desc: "",
    cta: "",
    link: "",
    image: "",
    isActive: true,
  };
  const [formData, setFormData] = useState<Promotion>(emptyForm);

  // 🧩 Fetch all promotions
  async function fetchPromotions() {
    try {
      setLoading(true);
      const res = await axios.get("/api/promotions");
      setPromotions(res.data || []);
    } catch (err) {
      console.error("❌ Failed to load promotions:", err);
      toast.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPromotions();
  }, []);

  // 🧩 Handle form changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  // 🧩 Create or update promotion
  async function handleSave() {
    try {
      if (editingPromotion?._id) {
        await axios.put(`/api/promotions?id=${editingPromotion._id}`, formData);
        toast.success("Promotion updated");
      } else {
        await axios.post("/api/promotions", formData);
        toast.success("Promotion created");
      }
      setIsModalOpen(false);
      setEditingPromotion(null);
      setFormData(emptyForm);
      fetchPromotions();
    } catch (err) {
      console.error("❌ Save failed:", err);
      toast.error("Failed to save promotion");
    }
  }

  // 🧩 Delete promotion
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    try {
      await axios.delete(`/api/promotions?id=${id}`);
      toast.success("Promotion deleted");
      fetchPromotions();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      toast.error("Failed to delete promotion");
    }
  }

  return (
    <section className="p-6 space-y-6 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Promotions</h2>
        <button
          onClick={() => {
            setFormData(emptyForm);
            setEditingPromotion(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <FiPlus /> New Promotion
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading promotions...</p>
      ) : promotions.length === 0 ? (
        <p className="text-gray-500">No promotions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-gray-700">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">CTA</th>
                <th className="px-4 py-2 text-left">Active</th>
                <th className="px-4 py-2 text-left">Start</th>
                <th className="px-4 py-2 text-left">End</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.title}</td>
                  <td className="px-4 py-2">{p.desc}</td>
                  <td className="px-4 py-2">{p.cta}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        p.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {p.startDate ? new Date(p.startDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {p.endDate ? new Date(p.endDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => {
                        setEditingPromotion(p);
                        setFormData(p);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => p._id && handleDelete(p._id)}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="bg-white rounded-xl shadow-2xl w-[90%] max-w-2xl mx-auto my-10 p-8 outline-none overflow-y-auto max-h-[90vh]"
        overlayClassName="fixed inset-0 bg-[#00000070] flex justify-center items-center transition-opacity duration-200"
      >
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">
          {editingPromotion ? "Edit Promotion" : "New Promotion"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="desc"
              value={formData.desc}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CTA Text</label>
            <input
              name="cta"
              value={formData.cta}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Link</label>
            <input
              name="link"
              value={formData.link}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Image URL</label>
            <input
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2"
            />
            {formData.image && (
              <img
                src={formData.image}
                alt="Promotion Preview"
                className="mt-3 rounded-md border max-h-48 object-cover"
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <label className="text-sm text-gray-700">Active</label>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 rounded-md border text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {editingPromotion ? "Update" : "Create"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
