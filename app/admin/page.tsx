"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard, Clock, UtensilsCrossed, Users, ShoppingCart,
  LogOut, RefreshCw, TrendingUp, ShoppingBag, Wallet, CreditCard,
  CheckCircle, AlertTriangle, Lock, Plus, Pencil, Trash2,
  Eye, EyeOff, X, Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { useProducts } from "../context/product-context"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyStats {
  total_orders: number
  total_sales: number
  total_subtotal: number
  total_service_charge: number
}
interface PaymentBreakdown { payment_method: string; count: number; total: number }
interface RecentOrder {
  id: string; order_number: string
  items: Array<{ name: string; quantity: number; price: number }>
  subtotal: number; service_charge: number; grand_total: number
  payment_method: string; server_name: string; created_by: string; created_at: string
}
interface SalesData { date: string; stats: DailyStats; paymentBreakdown: PaymentBreakdown[]; recentOrders: RecentOrder[] }
interface ShiftRecord {
  id: number; cashier_name: string; cashier_username: string
  start_time: string; end_time: string | null; status: "open" | "closed"
  start_balance: number; end_balance: number | null
  total_cash_sales: number; total_sales: number
  expected_cash: number | null; discrepancy: number | null
}
interface Product {
  id: number; name: string; price: number; category: string
  image: string | null; description: string | null; available: boolean
}
interface StaffUser {
  id: number; username: string; name: string; role: string; created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₱${(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true })
}
function PaymentIcon({ method }: { method: string }) {
  if (method === "cash") return <Wallet className="h-3 w-3 inline mr-1" />
  if (method === "card") return <CreditCard className="h-3 w-3 inline mr-1" />
  return <span className="mr-1 text-[10px] font-bold">G</span>
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────

type Section = "dashboard" | "shifts" | "menu" | "staff"
const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard",       icon: LayoutDashboard  },
  { id: "shifts",    label: "Shift Reports",   icon: Clock            },
  { id: "menu",      label: "Menu Management", icon: UtensilsCrossed  },
  { id: "staff",     label: "Staff Accounts",  icon: Users            },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activeSection, setActiveSection] = useState<Section>("dashboard")
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString("en-CA"))
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchSales = useCallback(async (date: string) => {
    const res = await fetch(`/api/sales?date=${date}`)
    if (res.ok) setSalesData(await res.json())
  }, [])

  const fetchShifts = useCallback(async (date: string) => {
    const res = await fetch(`/api/shifts?date=${date}`)
    if (res.ok) { const j = await res.json(); setShifts(j.shifts ?? []) }
  }, [])

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/users")
    if (res.ok) { const j = await res.json(); setStaff(j.users ?? []) }
  }, [])

  const refreshCurrent = useCallback(async () => {
    setIsLoading(true)
    try {
      if (activeSection === "dashboard") await fetchSales(selectedDate)
      else if (activeSection === "shifts") await fetchShifts(selectedDate)
      else if (activeSection === "staff") await fetchStaff()
    } finally {
      setIsLoading(false)
    }
  }, [activeSection, selectedDate, fetchSales, fetchShifts, fetchStaff])

  useEffect(() => {
    if (status === "authenticated" && isAdmin && activeSection !== "menu") refreshCurrent()
  }, [activeSection, selectedDate, status, isAdmin])

  // ── Auth guards ────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">Admin access required.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>Back to POS</Button>
        </div>
      </div>
    )
  }

  const showDatePicker = activeSection === "dashboard" || activeSection === "shifts"

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-white border-r flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b flex items-center gap-3">
          <Image
            src="/corongrilldiners-logo.jpeg"
            alt="Coron Grill Diners"
            width={36}
            height={36}
            className="rounded-full object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">Coron Grill</p>
            <p className="text-[10px] text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeSection === id
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}

          <div className="pt-3 mt-3 border-t">
            <button
              onClick={() => router.push("/pos")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <ShoppingCart className="h-4 w-4 flex-shrink-0" />
              Open POS Register
            </button>
          </div>
        </nav>

        {/* User + Sign out */}
        <div className="p-3 border-t">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold truncate">{session?.user?.name}</p>
            <p className="text-[10px] text-muted-foreground">Administrator</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
            </h1>
            <p className="text-xs text-muted-foreground">Coron Grill Diners POS</p>
          </div>
          <div className="flex items-center gap-2">
            {showDatePicker && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-white"
              />
            )}
            {activeSection !== "menu" && (
              <Button variant="outline" size="icon" onClick={refreshCurrent} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === "menu" ? (
            <MenuSection />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-32">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeSection === "dashboard" ? (
            <DashboardSection data={salesData} selectedDate={selectedDate} />
          ) : activeSection === "shifts" ? (
            <ShiftsSection shifts={shifts} selectedDate={selectedDate} />
          ) : (
            <StaffSection staff={staff} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Section ────────────────────────────────────────────────────────

function DashboardSection({ data, selectedDate }: { data: SalesData | null; selectedDate: string }) {
  if (!data) return <EmptyState icon={TrendingUp} message="Failed to load sales data." />

  const isToday = selectedDate === new Date().toLocaleDateString("en-CA")

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Total Daily Sales" value={fmt(data.stats.total_sales)}
          sub={isToday ? "Today" : selectedDate} valueClass="text-green-600" />
        <StatCard icon={ShoppingBag} label="Total Orders" value={String(data.stats.total_orders)}
          sub={`${data.stats.total_orders === 1 ? "order" : "orders"} completed`} />
        <StatCard icon={Wallet} label="Avg. Order Value"
          value={data.stats.total_orders > 0 ? fmt(data.stats.total_sales / data.stats.total_orders) : "₱0.00"}
          sub="per transaction" />
      </div>

      {data.paymentBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Payment Breakdown</h2>
          <div className="space-y-2">
            {data.paymentBreakdown.map((p) => (
              <div key={p.payment_method} className="flex items-center justify-between">
                <span className="text-sm capitalize flex items-center">
                  <PaymentIcon method={p.payment_method} />
                  {p.payment_method} ({p.count} {p.count === 1 ? "order" : "orders"})
                </span>
                <span className="font-medium text-sm">{fmt(p.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-5 border-b"><h2 className="font-semibold">Recent Orders</h2></div>
        {data.recentOrders.length === 0 ? (
          <EmptyState icon={ShoppingBag} message="No orders recorded for this date." />
        ) : (
          <div className="divide-y">
            {data.recentOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm">{order.order_number}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        <PaymentIcon method={order.payment_method} />{order.payment_method}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtTime(order.created_at)} · By: <span className="font-medium">{order.created_by || order.server_name}</span>
                    </p>
                    <div className="mt-1.5 text-xs text-gray-600">
                      {order.items?.map((item, i) => (
                        <span key={i} className="mr-2">{item.quantity}× {item.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="font-bold text-green-600">{fmt(order.grand_total)}</p>
                    {order.service_charge > 0 && (
                      <p className="text-[10px] text-muted-foreground">incl. {fmt(order.service_charge)} svc</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shifts Section ───────────────────────────────────────────────────────────

function ShiftsSection({ shifts, selectedDate }: { shifts: ShiftRecord[]; selectedDate: string }) {
  const isToday = selectedDate === new Date().toLocaleDateString("en-CA")
  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="font-semibold">Shift Records — {isToday ? "Today" : selectedDate}</h2>
        <span className="text-sm text-muted-foreground">{shifts.length} shift{shifts.length !== 1 ? "s" : ""}</span>
      </div>
      {shifts.length === 0 ? (
        <EmptyState icon={Clock} message="No shifts recorded for this date." />
      ) : (
        <div className="divide-y">
          {shifts.map((shift) => {
            const disc = shift.discrepancy ?? 0
            const isOpen = shift.status === "open"
            const isOver = !isOpen && disc > 0
            const isShort = !isOpen && disc < 0
            const isExact = !isOpen && disc === 0
            return (
              <div key={shift.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold">{shift.cashier_name}</span>
                      <span className="text-xs text-muted-foreground">@{shift.cashier_username}</span>
                      {isOpen ? (
                        <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 border-0">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Closed</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmtTime(shift.start_time)}
                      {shift.end_time ? ` → ${fmtTime(shift.end_time)}` : " (ongoing)"}
                    </p>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Starting Cash</span>
                        <span className="font-mono font-medium">{fmt(shift.start_balance)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Cash Sales</span>
                        <span className="font-mono font-medium text-green-600">+{fmt(shift.total_cash_sales)}</span>
                      </div>
                      {!isOpen && (
                        <>
                          <div>
                            <span className="text-muted-foreground block">Expected</span>
                            <span className="font-mono font-medium">{fmt(shift.expected_cash ?? 0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Actual</span>
                            <span className="font-mono font-medium">{fmt(shift.end_balance ?? 0)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
                    <p className="font-bold text-base">{fmt(shift.total_sales)}</p>
                    {!isOpen && (
                      <div className={`mt-2 rounded-md px-2.5 py-1 text-xs font-semibold ${isExact ? "bg-green-50 text-green-700" : isOver ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                        <div className="flex items-center gap-1 justify-end">
                          {isExact ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          <span>{isExact ? "Balanced" : isOver ? "Over" : "Short"}</span>
                        </div>
                        <span className="font-mono">{disc >= 0 ? "+" : ""}{fmt(disc)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Menu Management Section (uses shared product context) ────────────────────

function MenuSection() {
  const { products, categories, isLoading, addProduct, updateProduct, deleteProduct, refreshProducts } = useProducts()
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [filterCat, setFilterCat] = useState("all")
  const [saving, setSaving] = useState(false)

  const filtered = filterCat === "all" ? products : products.filter((p) => p.category === filterCat)
  const usedCats = Array.from(new Set(products.map((p) => p.category)))

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id

  const handleToggleAvailability = async (product: Product) => {
    await updateProduct(product.id, { available: !product.available })
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product? This cannot be undone.")) return
    await deleteProduct(id)
  }

  const handleSave = async (data: Omit<Product, "id"> & { id?: number }) => {
    setSaving(true)
    try {
      if (data.id) {
        await updateProduct(data.id, data)
      } else {
        await addProduct(data)
      }
      setShowModal(false)
      setEditingProduct(null)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-white"
          >
            <option value="all">All Categories ({products.length})</option>
            {usedCats.map((c) => (
              <option key={c} value={c}>
                {getCategoryName(c)} ({products.filter((p) => p.category === c).length})
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => { setEditingProduct(null); setShowModal(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={UtensilsCrossed} message="No products found." />
        ) : (
          <div className="divide-y">
            {filtered.map((product) => (
              <div key={product.id} className="flex items-center gap-4 p-3 hover:bg-gray-50">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <UtensilsCrossed className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    {!product.available && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-red-50 text-red-600 border-0">
                        Unavailable
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{getCategoryName(product.category)}</p>
                </div>
                <p className="font-semibold text-sm flex-shrink-0">{fmt(product.price)}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8"
                    title={product.available ? "Mark Unavailable" : "Mark Available"}
                    onClick={() => handleToggleAvailability(product)}
                  >
                    {product.available
                      ? <Eye className="h-4 w-4 text-green-600" />
                      : <EyeOff className="h-4 w-4 text-gray-400" />}
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => { setEditingProduct(product as any); setShowModal(true) }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingProduct(null) }}
        />
      )}
    </>
  )
}

// ─── Product Form Modal ───────────────────────────────────────────────────────

function ProductFormModal({
  product, categories, saving, onSave, onClose,
}: {
  product: Product | null
  categories: { id: string; name: string }[]
  saving: boolean
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [name, setName] = useState(product?.name ?? "")
  const [price, setPrice] = useState(product?.price?.toString() ?? "")
  const [category, setCategory] = useState(product?.category ?? "")
  const [image, setImage] = useState(product?.image ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [available, setAvailable] = useState(product?.available ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: product?.id,
      name, price: parseFloat(price), category,
      image: image || null, description: description || null, available,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{product ? "Edit Product" : "Add New Product"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grilled Chicken" required />
          </div>
          <div className="space-y-1.5">
            <Label>Price (₱)</Label>
            <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Image URL (optional)</Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Includes Rice & Soup" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="available" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="available" className="cursor-pointer">Available for sale</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {product ? "Save Changes" : "Add Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Staff Accounts Section ───────────────────────────────────────────────────

function StaffSection({ staff }: { staff: StaffUser[] }) {
  const admins = staff.filter((u) => u.role === "admin")
  const cashiers = staff.filter((u) => u.role === "staff")

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold">All Staff Accounts</h2>
          <span className="text-sm text-muted-foreground">{staff.length} account{staff.length !== 1 ? "s" : ""}</span>
        </div>
        {staff.length === 0 ? (
          <EmptyState icon={Users} message="No staff accounts found." />
        ) : (
          <div className="divide-y">
            {[...admins, ...cashiers].map((user) => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <Badge
                  className={`text-xs flex-shrink-0 ${
                    user.role === "admin"
                      ? "bg-primary/10 text-primary border-0"
                      : "bg-gray-100 text-gray-600 border-0"
                  }`}
                >
                  {user.role === "admin" ? "Admin" : "Cashier"}
                </Badge>
                <p className="text-xs text-muted-foreground flex-shrink-0">
                  Since {new Date(user.created_at).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, valueClass,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; valueClass?: string
}) {
  return (
    <div className="bg-white rounded-xl border p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${valueClass ?? ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
