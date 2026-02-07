"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  markInventoryItemFinished,
  getFamilies,
  type InventoryItem,
  type Family,
} from "../actions";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const familyIdFromUrl = searchParams.get("family") || undefined;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | undefined>(familyIdFromUrl);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    unit: "",
    category: "",
    familyId: "",
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [fetched, familiesData] = await Promise.all([
        getInventoryItems(selectedFamilyId),
        getFamilies(),
      ]);
      setItems(fetched);
      setFamilies(familiesData);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      setError("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [selectedFamilyId]);

  useEffect(() => {
    setSelectedFamilyId(familyIdFromUrl);
  }, [familyIdFromUrl]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort();

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const canMarkFinished = (item: InventoryItem) => item.familyId || item.userId; // Personal or family items

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("amount", formData.amount);
    if (formData.unit) formDataObj.append("unit", formData.unit);
    if (formData.category) formDataObj.append("category", formData.category);
    if (formData.familyId) formDataObj.append("familyId", formData.familyId);

    if (editingItem) {
      const result = await updateInventoryItem(editingItem._id!, formDataObj);
      if (result.success) {
        setSuccess("Item updated!");
        setEditingItem(null);
        resetForm();
        setShowForm(false);
        await loadItems();
      } else {
        setError(result.error || "Failed to update");
      }
    } else {
      const result = await createInventoryItem(formDataObj);
      if (result.success) {
        setSuccess("Item added!");
        resetForm();
        setShowForm(false);
        await loadItems();
      } else {
        setError(result.error || "Failed to add");
      }
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      amount: String(item.amount),
      unit: item.unit || "",
      category: item.category || "",
      familyId: item.familyId || "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleMarkFinished = async (item: InventoryItem) => {
    if (!item._id) return;
    setError(null);
    const finished = !item.finished;
    const result = await markInventoryItemFinished(item._id, finished);
    if (result.success) {
      setSuccess(finished ? "Item marked as finished!" : "Item unmarked");
      await loadItems();
      setTimeout(() => setSuccess(null), 2000);
    } else {
      setError(result.error || "Failed to update");
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setError(null);
    const result = await deleteInventoryItem(item._id!);
    if (result.success) {
      setSuccess("Item deleted!");
      await loadItems();
    } else {
      setError(result.error || "Failed to delete");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", amount: "", unit: "", category: "", familyId: selectedFamilyId || "" });
  };

  const cancelForm = () => {
    setEditingItem(null);
    resetForm();
    setShowForm(false);
    setError(null);
  };

  const openAddForm = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      amount: "",
      unit: "",
      category: "",
      familyId: selectedFamilyId || "",
    });
    setShowForm(true);
  };

  const formatAmount = (item: InventoryItem) => {
    const num = Number(item.amount);
    const formatted = num === Math.floor(num) ? num.toString() : num.toLocaleString();
    return item.unit ? `${formatted} ${item.unit}` : formatted;
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 dark:from-amber-900 dark:via-orange-900 dark:to-rose-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Home Inventory
                </h1>
                <p className="text-amber-100 text-lg">
                  Track your items and amounts
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <p className="text-3xl font-bold text-white">{items.length}</p>
                  <p className="text-amber-200 text-sm">Total Items</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <p className="text-3xl font-bold text-white">{categories.length}</p>
                  <p className="text-amber-200 text-sm">Categories</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-3">
              <span className="text-xl">✓</span>
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">×</button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <select
              value={selectedFamilyId || ""}
              onChange={(e) => {
                const val = e.target.value || undefined;
                setSelectedFamilyId(val);
                router.push(val ? `/inventory?family=${val}` : "/inventory", { scroll: false });
              }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All inventory (personal + families)</option>
              {families.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c!}>{c}</option>
              ))}
            </select>
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium rounded-xl shadow-lg transition-all"
            >
              <span>+</span>
              Add Item
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-24">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mb-6">
                <span className="text-5xl">📦</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No inventory items yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
                Add items to track what you have at home and their amounts.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all"
              >
                + Add first item
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Item</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Category</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Family</th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Done</th>
                      <th className="w-24 px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={item._id}
                        className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-amber-50/50 dark:hover:bg-gray-700/30 transition-colors ${item.finished ? "opacity-60" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <span className={`font-medium text-gray-900 dark:text-white ${item.finished ? "line-through" : ""}`}>
                            {item.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatAmount(item)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.category ? (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {item.familyName ? (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                              {item.familyName}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {canMarkFinished(item) ? (
                            <button
                              onClick={() => handleMarkFinished(item)}
                              className={`p-2 rounded-lg transition-colors ${
                                item.finished
                                  ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                                  : "text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                              }`}
                              aria-label={item.finished ? "Mark as not finished" : "Mark as finished"}
                              title={item.finished ? "Mark as not finished" : "Mark as finished"}
                            >
                              {item.finished ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                              aria-label="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              aria-label="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingItem ? "Edit Item" : "Add Item"}
                </h2>
                <button
                  onClick={cancelForm}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Coffee Beans"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit (optional)</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. g, pcs, ml"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category (optional)</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Kitchen, Pantry"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                {!editingItem && families.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add to family (optional)</label>
                    <select
                      value={formData.familyId}
                      onChange={(e) => setFormData({ ...formData, familyId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Personal inventory</option>
                      {families.map((f) => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium hover:from-amber-700 hover:to-orange-700 transition-all"
                  >
                    {editingItem ? "Update" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <Navigation />
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <InventoryContent />
      </Suspense>
    </ProtectedRoute>
  );
}
