"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  AlertTriangle,
  History,
  Package,
  CheckCircle2,
  XCircle,
  Receipt,
  MessageCircle,
  ArrowRight,
  User,
  Phone,
  Tag,
  CreditCard,
  ShieldCheck,
  Ban,
  Loader2,
  Edit2,
  Sliders,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { PaymentSplitRows, SplitModeRow } from "@/components/PaymentSplitRows";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { buildShareLink } from "@/lib/whatsapp";
import { SkeletonList, SkeletonTable } from "@/components/Skeleton";

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number; // paise
  cost?: number; // paise (optional for receptionists)
  stock: number;
  lowStockLevel: number;
  isLowStock: boolean;
  isActive: boolean;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
}

interface SaleRecord {
  id: string;
  saleNumber: string;
  customer: {
    id?: string;
    name: string;
    phone: string;
    code?: string;
    isMember: boolean;
  };
  items: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  profit?: number;
  isVoid: boolean;
  voidReason?: string;
  soldBy: string;
  createdAt: string;
}

export default function SalesPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"pos" | "history" | "products">("pos");
  const [userRole, setUserRole] = useState<string>("receptionist");

  // Products state
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // POS Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerType, setCustomerType] = useState<"guest" | "member">("guest");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string; phone: string; code: string } | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [discountRupees, setDiscountRupees] = useState("");
  const [paymentSplitRows, setPaymentSplitRows] = useState<SplitModeRow[]>([
    { mode: "cash", amount: 0 },
  ]);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState<SaleRecord | null>(null);

  // Sales History State
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [saleSearch, setSaleSearch] = useState("");

  // Void Modal State
  const [saleToVoid, setSaleToVoid] = useState<SaleRecord | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // Add / Edit Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("Supplements");
  const [prodPriceRupees, setProdPriceRupees] = useState("");
  const [prodCostRupees, setProdCostRupees] = useState("");
  const [prodStock, setProdStock] = useState("");
  const [prodLowStock, setProdLowStock] = useState("5");
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Stock Adjustment Modal
  const [stockAdjustProduct, setStockAdjustProduct] = useState<ProductItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  const canSeeCostAndProfit = userRole === "owner" || userRole === "manager";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.user?.role) setUserRole(data.data.user.role);
      })
      .catch((err) => console.error("Error loading role:", err));
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch)}`);
      const data = await res.json();
      if (data.data) setProducts(data.data);
    } catch {
      showToast("Error loading products", "error");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadSales = async () => {
    setLoadingSales(true);
    try {
      const branchId = localStorage.getItem("alpha_active_branch_id") || "";
      let url = `/api/sales?search=${encodeURIComponent(saleSearch)}`;
      if (branchId) url += `&branchId=${branchId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.data) setSales(data.data);
    } catch {
      showToast("Error loading sales history", "error");
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    if (activeTab === "pos" || activeTab === "products") {
      loadProducts();
    }
    if (activeTab === "history") {
      loadSales();
    }
  }, [activeTab]);

  // Search Members for Member Customer
  useEffect(() => {
    if (customerType === "member" && memberSearchQuery.trim().length >= 2) {
      fetch(`/api/members?search=${encodeURIComponent(memberSearchQuery)}&limit=5`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) setMemberResults(data.data);
        })
        .catch(() => {});
    } else {
      setMemberResults([]);
    }
  }, [customerType, memberSearchQuery]);

  // Cart Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountPaise = Math.min(rupeesToPaise(discountRupees || 0), cartSubtotal);
  const cartTotal = Math.max(0, cartSubtotal - discountPaise);

  // Keep single payment row synced by default if not manually edited
  useEffect(() => {
    if (paymentSplitRows.length === 1) {
      setPaymentSplitRows([{ mode: paymentSplitRows[0].mode, amount: cartTotal }]);
    }
  }, [cartTotal]);

  const addToCart = (product: ProductItem) => {
    if (product.stock <= 0) {
      showToast(`"${product.name}" is out of stock!`, "warning");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`Cannot add more than available stock (${product.stock})`, "warning");
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.product.stock) {
              showToast(`Only ${item.product.stock} units available in stock`, "warning");
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    if (customerType === "guest" && !guestName.trim()) {
      showToast("Guest name is required", "warning");
      return;
    }

    if (customerType === "member" && !selectedMember) {
      showToast("Please select a registered member", "warning");
      return;
    }

    const splitSum = paymentSplitRows.reduce((sum, r) => sum + (r.amount || 0), 0);
    if (splitSum !== cartTotal) {
      showToast(`Payment split total (${formatPaise(splitSum)}) must equal sale total (${formatPaise(cartTotal)})`, "error");
      return;
    }

    setIsProcessingSale(true);
    try {
      const branchId = localStorage.getItem("alpha_active_branch_id") || undefined;
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            productId: c.product.id,
            quantity: c.quantity,
          })),
          memberId: customerType === "member" ? selectedMember?.id : undefined,
          guestName: customerType === "guest" ? guestName.trim() : undefined,
          guestPhone: customerType === "guest" ? guestPhone.trim() : undefined,
          discountPaise,
          paymentModes: paymentSplitRows,
          branchId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Sale completed successfully!", "success");
        // Clear cart
        setCart([]);
        setGuestName("");
        setGuestPhone("");
        setSelectedMember(null);
        setDiscountRupees("");
        // Show receipt modal
        setCompletedSale({
          id: data.data.id,
          saleNumber: data.data.saleNumber,
          customer: {
            name: customerType === "member" ? selectedMember!.name : guestName,
            phone: customerType === "member" ? selectedMember!.phone : guestPhone,
            isMember: customerType === "member",
          },
          items: data.data.items,
          subtotal: cartSubtotal,
          discount: discountPaise,
          total: data.data.total,
          isVoid: false,
          soldBy: "Staff",
          createdAt: data.data.createdAt,
        });
        loadProducts();
      } else {
        showToast(data.error?.message || "Failed to complete sale", "error");
      }
    } catch {
      showToast("Network error processing sale", "error");
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleShareReceiptWhatsApp = (sale: SaleRecord) => {
    const itemsList = sale.items
      .map((it) => `• ${it.name} x${it.quantity} - ${formatPaise(it.total)}`)
      .join("\n");
    const text = `*ALPHA WARRIORS FITNESS*\n🧾 *Sale Receipt #${sale.saleNumber}*\nDate: ${formatDate(sale.createdAt)}\nCustomer: ${sale.customer.name}\n\n*Items:*\n${itemsList}\n\n*Total Paid:* ${formatPaise(sale.total)}\nThank you for choosing Alpha Warriors! Train. Push. Dominate. 💪`;
    const link = buildShareLink(sale.customer.phone, text);
    window.open(link, "_blank");
  };

  const handleVoidSale = async () => {
    if (!saleToVoid) return;
    if (!voidReason.trim()) {
      showToast("Void reason is required", "warning");
      return;
    }

    setIsVoiding(true);
    try {
      const res = await fetch(`/api/sales/${saleToVoid.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Sale voided and stock restored!", "success");
        setSaleToVoid(null);
        setVoidReason("");
        loadSales();
        loadProducts();
      } else {
        showToast(data.error?.message || "Failed to void sale", "error");
      }
    } catch {
      showToast("Network error voiding sale", "error");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast("Product name is required", "warning");
      return;
    }

    setIsSavingProduct(true);
    try {
      const priceNum = parseFloat(prodPriceRupees) || 0;
      const costNum = parseFloat(prodCostRupees) || 0;
      const stockNum = parseInt(prodStock, 10) || 0;
      const lowStockNum = parseInt(prodLowStock, 10) || 5;

      if (editingProduct) {
        // Update
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: prodName.trim(),
            category: prodCategory.trim(),
            priceRupees: priceNum,
            costRupees: costNum,
            lowStockLevel: lowStockNum,
          }),
        });
        if (res.ok) {
          showToast("Product updated", "success");
          setIsProductModalOpen(false);
          loadProducts();
        } else {
          const err = await res.json();
          showToast(err.error?.message || "Failed to update", "error");
        }
      } else {
        // Create
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: prodName.trim(),
            category: prodCategory.trim(),
            priceRupees: priceNum,
            costRupees: costNum,
            stock: stockNum,
            lowStockLevel: lowStockNum,
          }),
        });
        if (res.ok) {
          showToast("Product created", "success");
          setIsProductModalOpen(false);
          loadProducts();
        } else {
          const err = await res.json();
          showToast(err.error?.message || "Failed to create", "error");
        }
      }
    } catch {
      showToast("Network error saving product", "error");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustProduct) return;
    const adj = parseInt(stockAdjustment, 10);
    if (isNaN(adj) || adj === 0) {
      showToast("Please enter a valid non-zero adjustment (+/-)", "warning");
      return;
    }
    if (!stockReason.trim()) {
      showToast("Reason is required", "warning");
      return;
    }

    setIsAdjustingStock(true);
    try {
      const res = await fetch(`/api/products/${stockAdjustProduct.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment: adj, reason: stockReason.trim() }),
      });
      if (res.ok) {
        showToast("Stock updated successfully", "success");
        setStockAdjustProduct(null);
        setStockAdjustment("");
        setStockReason("");
        loadProducts();
      } else {
        const err = await res.json();
        showToast(err.error?.message || "Failed to adjust stock", "error");
      }
    } catch {
      showToast("Network error adjusting stock", "error");
    } finally {
      setIsAdjustingStock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-red-600" />
            Store POS & Merchandise
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Sell supplements, apparel & equipment to members and walk-ins
          </p>
        </div>

        {/* Tab Nav Buttons */}
        <div className="inline-flex p-1 bg-gray-200/80 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab("pos")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === "pos"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-red-600" />
            New Sale
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === "history"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <History className="w-3.5 h-3.5 text-gray-500" />
            Sales History
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === "products"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Package className="w-3.5 h-3.5 text-gray-500" />
            Products & Stock
          </button>
        </div>
      </div>

      {/* TAB 1: NEW SALE POS */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Selection Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by name or category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadProducts()}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 shadow-2xs"
              />
            </div>

            {loadingProducts ? (
              <SkeletonList count={6} />
            ) : products.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="font-bold text-gray-800 text-sm">No products in inventory</p>
                <p className="text-xs text-gray-500 mt-1">Switch to &apos;Products & Stock&apos; tab to add items.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products
                  .filter((p) => p.isActive)
                  .map((product) => {
                    const inCart = cart.find((c) => c.product.id === product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`p-3.5 rounded-xl border bg-white flex flex-col justify-between transition cursor-pointer select-none hover:shadow-md hover:border-red-500/50 ${
                          product.stock <= 0 ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                              {product.category}
                            </span>
                            {product.isLowStock && (
                              <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                                Low
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 mt-1 line-clamp-2">
                            {product.name}
                          </h4>
                        </div>

                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="font-extrabold text-sm text-red-600">
                            {formatPaise(product.price)}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            Stock: {product.stock}
                          </span>
                        </div>

                        {inCart && (
                          <div className="mt-2 text-center bg-red-50 text-red-600 text-[10px] font-black py-0.5 rounded-md">
                            {inCart.quantity} in Cart
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Right Column: Checkout Cart & Payment (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-600" />
                  Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-gray-400 hover:text-red-600 font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto no-scrollbar py-2">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    Your cart is empty. Click any product to add.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-[11px] text-gray-500">
                          {formatPaise(item.product.price)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded-md bg-gray-100 text-gray-800 font-black text-xs hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded-md bg-gray-100 text-gray-800 font-black text-xs hover:bg-gray-200"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-gray-400 hover:text-red-600 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-black text-xs text-gray-900">
                        {formatPaise(item.product.price * item.quantity)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer Selector */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Customer
                  </span>
                  <div className="inline-flex p-0.5 bg-gray-100 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCustomerType("guest")}
                      className={`px-2.5 py-1 rounded-md transition ${
                        customerType === "guest" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
                      }`}
                    >
                      Walk-in Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerType("member")}
                      className={`px-2.5 py-1 rounded-md transition ${
                        customerType === "member" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
                      }`}
                    >
                      Member
                    </button>
                  </div>
                </div>

                {customerType === "guest" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Guest Name *"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    {selectedMember ? (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-red-950">{selectedMember.name}</p>
                          <p className="text-[11px] text-red-700">
                            {selectedMember.code} • {selectedMember.phone}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedMember(null)}
                          className="text-red-600 font-bold hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Search member by name, phone or code..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600"
                        />
                        {memberResults.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {memberResults.map((m) => (
                              <div
                                key={m.id}
                                onClick={() => {
                                  setSelectedMember({
                                    id: m.id,
                                    name: m.name,
                                    phone: m.phone,
                                    code: m.memberCode,
                                  });
                                  setMemberSearchQuery("");
                                  setMemberResults([]);
                                }}
                                className="p-2 text-xs hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none flex items-center justify-between"
                              >
                                <span className="font-bold text-gray-900">{m.name}</span>
                                <span className="text-gray-500 font-medium">{m.memberCode}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Discount */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gray-400" /> Discount (₹)
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountRupees}
                    onChange={(e) => setDiscountRupees(e.target.value)}
                    className="w-24 px-2.5 py-1.5 text-xs text-right rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>

                {/* Split Modes Payment Component */}
                <div className="pt-2">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-red-600" />
                    Payment Modes
                  </p>
                  <PaymentSplitRows
                    totalPaise={cartTotal}
                    rows={paymentSplitRows}
                    onChange={setPaymentSplitRows}
                  />
                </div>
              </div>
            </div>

            {/* Total Summary and Complete Button */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Subtotal:</span>
                <span className="font-bold">{formatPaise(cartSubtotal)}</span>
              </div>
              {discountPaise > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-bold">-{formatPaise(discountPaise)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-black text-gray-900">
                <span>Total Amount:</span>
                <span className="text-red-600 text-lg">{formatPaise(cartTotal)}</span>
              </div>

              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={isProcessingSale || cart.length === 0}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-md shadow-red-900/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessingSale ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing Sale...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Complete Sale ({formatPaise(cartTotal)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search sales by #SALE number or customer..."
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadSales()}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 shadow-2xs"
              />
            </div>
          </div>

          {loadingSales ? (
            <SkeletonTable rows={5} cols={7} />
          ) : sales.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
              <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="font-bold text-gray-800 text-sm">No sales recorded yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-slate-950 text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Receipt / Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items Sold</th>
                      <th className="px-4 py-3 text-right">Total Paid</th>
                      {canSeeCostAndProfit && <th className="px-4 py-3 text-right">Profit</th>}
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.map((sale) => (
                      <tr
                        key={sale.id}
                        className={`hover:bg-gray-50 transition ${sale.isVoid ? "bg-rose-50/40 opacity-70" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-black text-gray-900">{sale.saleNumber}</p>
                          <p className="text-[11px] text-gray-400">{formatDate(sale.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{sale.customer.name}</p>
                          <p className="text-[11px] text-gray-400">{sale.customer.phone || "No phone"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 line-clamp-1">
                            {sale.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-gray-900">
                          {formatPaise(sale.total)}
                        </td>
                        {canSeeCostAndProfit && (
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">
                            {sale.profit !== undefined ? formatPaise(sale.profit) : "—"}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          {sale.isVoid ? (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              Voided
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Paid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {sale.customer.phone && (
                            <button
                              onClick={() => handleShareReceiptWhatsApp(sale)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Share receipt via WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          {!sale.isVoid && canSeeCostAndProfit && (
                            <button
                              onClick={() => {
                                setSaleToVoid(sale);
                                setVoidReason("");
                              }}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Void Sale"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCTS & STOCK INVENTORY */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadProducts()}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 shadow-2xs"
              />
            </div>

            {canSeeCostAndProfit && (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProdName("");
                  setProdCategory("Supplements");
                  setProdPriceRupees("");
                  setProdCostRupees("");
                  setProdStock("");
                  setProdLowStock("5");
                  setIsProductModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-900/20 shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-slate-950 text-white uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Selling Price</th>
                    {canSeeCostAndProfit && <th className="px-4 py-3 text-right">Cost Price</th>}
                    <th className="px-4 py-3 text-center">Stock Level</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-bold text-gray-900">{product.name}</td>
                      <td className="px-4 py-3 text-gray-500">{product.category}</td>
                      <td className="px-4 py-3 text-right font-black text-gray-900">
                        {formatPaise(product.price)}
                      </td>
                      {canSeeCostAndProfit && (
                        <td className="px-4 py-3 text-right font-medium text-gray-500">
                          {product.cost !== undefined ? formatPaise(product.cost) : "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-black text-xs ${
                              product.isLowStock ? "text-amber-600" : "text-gray-900"
                            }`}
                          >
                            {product.stock}
                          </span>
                          {/* Low-stock badge requirement */}
                          {product.isLowStock && (
                            <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            product.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {product.isActive ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setStockAdjustProduct(product);
                            setStockAdjustment("");
                            setStockReason("");
                          }}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                          title="Adjust Stock Quantity"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                        {canSeeCostAndProfit && (
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setProdName(product.name);
                              setProdCategory(product.category);
                              setProdPriceRupees((product.price / 100).toString());
                              setProdCostRupees(
                                product.cost !== undefined ? (product.cost / 100).toString() : ""
                              );
                              setProdStock(product.stock.toString());
                              setProdLowStock(product.lowStockLevel.toString());
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden text-gray-900">
            <div className="p-5 bg-slate-950 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-500" />
                Sale Receipt #{completedSale.saleNumber}
              </h3>
              <button
                onClick={() => setCompletedSale(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold">Payment received and sale recorded!</span>
              </div>

              <div>
                <p className="text-gray-500">Customer:</p>
                <p className="font-extrabold text-sm">{completedSale.customer.name}</p>
                {completedSale.customer.phone && (
                  <p className="text-gray-600">{completedSale.customer.phone}</p>
                )}
              </div>

              <div className="border-t border-b border-gray-100 py-2 divide-y divide-gray-50">
                {completedSale.items.map((it, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between">
                    <span>
                      {it.name} x{it.quantity}
                    </span>
                    <span className="font-bold">{formatPaise(it.total)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm font-black">
                <span>Total Paid:</span>
                <span className="text-red-600">{formatPaise(completedSale.total)}</span>
              </div>

              <div className="pt-2 flex gap-3">
                {completedSale.customer.phone && (
                  <button
                    onClick={() => handleShareReceiptWhatsApp(completedSale)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-4 h-4" /> Share Receipt
                  </button>
                )}
                <button
                  onClick={() => setCompletedSale(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Sale Modal */}
      {saleToVoid && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 bg-rose-950 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-500" />
                Void Sale #{saleToVoid.saleNumber}
              </h3>
              <button
                onClick={() => setSaleToVoid(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <p className="font-bold">Are you sure you want to void this sale?</p>
                <p className="mt-1 text-[11px] text-rose-700">
                  This will restore product stock back to inventory and mark the linked payment as voided.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reason for Void *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accidental entry, customer refund, wrong items"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSaleToVoid(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVoidSale}
                  disabled={isVoiding}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold transition touch-manipulation cursor-pointer"
                >
                  {isVoiding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Voiding...</span>
                    </>
                  ) : (
                    <span>Confirm Void</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockAdjustProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-red-500" />
                Adjust Stock: {stockAdjustProduct.name}
              </h3>
              <button
                onClick={() => setStockAdjustProduct(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-4 space-y-3 text-xs">
              <p className="text-gray-500">
                Current stock: <strong className="text-gray-900">{stockAdjustProduct.stock}</strong>
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Stock Adjustment (+ / -) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. +10 or -2"
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New supplier shipment, damaged unit, recount"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockAdjustProduct(null)}
                  className="px-3 py-2 rounded-xl border text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingStock}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold transition touch-manipulation cursor-pointer"
                >
                  {isAdjustingStock ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Adjustment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-red-500" />
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold Standard Whey Protein 2kg"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="Supplements">Supplements & Nutrition</option>
                  <option value="Merchandise">Apparel & Merchandise</option>
                  <option value="Equipment">Accessories & Equipment</option>
                  <option value="Beverages">Drinks & Shakes</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 4500"
                    value={prodPriceRupees}
                    onChange={(e) => setProdPriceRupees(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3200"
                    value={prodCostRupees}
                    onChange={(e) => setProdCostRupees(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {!editingProduct && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Initial Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={prodLowStock}
                      onChange={(e) => setProdLowStock(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-2 rounded-xl border text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold transition touch-manipulation cursor-pointer"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? "Update Product" : "Create Product"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
