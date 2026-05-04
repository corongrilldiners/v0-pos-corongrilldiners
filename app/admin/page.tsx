"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard, Clock, UtensilsCrossed, Users, ShoppingCart,
  LogOut, RefreshCw, TrendingUp, ShoppingBag, Wallet, CreditCard,
  CheckCircle, AlertTriangle, Lock, Plus, Pencil, Trash2,
  Eye, EyeOff, X, Save, KeyRound, History, UserPlus, KeySquare, UserX, UserCog,
  Archive, ArchiveRestore, ChevronDown, ChevronUp, FileText, Loader2, Ban, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { useProducts } from "../context/product-context"
import ChangePasswordDialog from "@/components/change-password-dialog"
import ShiftSummaryModal from "@/components/shift-summary-modal"

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
  archived: boolean; notes: string | null
  start_balance: number; end_balance: number | null
  total_cash_sales: number; total_sales: number
  expected_cash: number | null; discrepancy: number | null
}
interface SaleRecord {
  id: string; order_number: string
  items: Array<{ name: string; quantity: number; price: number }>
  subtotal: number; service_charge: number; grand_total: number
  payment_method: string; server_name: string; created_by: string
  status: string; void_reason: string | null; created_at: string
}
interface Product {
  id: number; name: string; price: number; category: string
  image: string | null; description: string | null; available: boolean
}
interface StaffUser {
  id: number; username: string; name: string; role: string; created_at: string
}
interface AuditEntry {
  id: number
  action: string
  actor_id: number
  actor_username: string
  target_user_id: number | null
  target_username: string | null
  details: string
  created_at: string
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

type Section = "dashboard" | "shifts" | "menu" | "staff" | "activity" | "security"
const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard",        icon: LayoutDashboard  },
  { id: "shifts",    label: "Shift Reports",    icon: Clock            },
  { id: "menu",      label: "Menu Management",  icon: UtensilsCrossed  },
  { id: "staff",     label: "Staff Accounts",   icon: Users            },
  { id: "activity",  label: "Activity Log",     icon: History          },
  { id: "security",  label: "Security History", icon: ShieldCheck      },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activeSection, setActiveSection] = useState<Section>("dashboard")
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString("en-CA"))
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [securityLog, setSecurityLog] = useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [shiftsKey, setShiftsKey] = useState(0)

  const isAdmin = session?.user?.role === "admin"

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchSales = useCallback(async (date: string) => {
    const res = await fetch(`/api/sales?date=${date}`)
    if (res.ok) setSalesData(await res.json())
  }, [])

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/users")
    if (res.ok) { const j = await res.json(); setStaff(j.users ?? []) }
  }, [])

  const fetchAuditLog = useCallback(async () => {
    const res = await fetch("/api/audit-log")
    if (res.ok) { const j = await res.json(); setAuditLog(j.entries ?? []) }
  }, [])

  const fetchSecurityLog = useCallback(async () => {
    const userId = Number(session?.user?.id)
    if (!Number.isFinite(userId) || userId <= 0) return
    const res = await fetch(`/api/audit-log?actor_id=${userId}&action=change_own_password`)
    if (res.ok) { const j = await res.json(); setSecurityLog(j.entries ?? []) }
  }, [session?.user])

  const refreshCurrent = useCallback(async () => {
    setIsLoading(true)
    try {
      if (activeSection === "dashboard") await fetchSales(selectedDate)
      else if (activeSection === "shifts") setShiftsKey(k => k + 1)
      else if (activeSection === "staff") await fetchStaff()
      else if (activeSection === "activity") await fetchAuditLog()
      else if (activeSection === "security") await fetchSecurityLog()
    } finally {
      setIsLoading(false)
    }
  }, [activeSection, selectedDate, fetchSales, fetchStaff, fetchAuditLog, fetchSecurityLog])

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
  const showRefresh = activeSection !== "menu"

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
            onClick={() => setChangePasswordOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <KeyRound className="h-4 w-4" />
            Change Password
          </button>
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
            {showRefresh && (
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
            <ShiftsSection key={`${selectedDate}-${shiftsKey}`} selectedDate={selectedDate} />
          ) : activeSection === "activity" ? (
            <AuditLogSection entries={auditLog} />
          ) : activeSection === "security" ? (
            <SecurityHistorySection
              entries={securityLog}
              adminName={session?.user?.name ?? ""}
              onChangePassword={() => setChangePasswordOpen(true)}
            />
          ) : (
            <StaffSection staff={staff} onRefresh={fetchStaff} />
          )}
        </div>
      </div>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
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

function OrderStatusBadge({ status }: { status: string }) {
  if (status === "completed") return (
    <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
      <CheckCircle className="h-2.5 w-2.5" />Done
    </span>
  )
  if (status === "void") return (
    <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
      <X className="h-2.5 w-2.5" />Void
    </span>
  )
  return (
    <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
      <Ban className="h-2.5 w-2.5" />Cancelled
    </span>
  )
}

function ShiftsSection({ selectedDate }: { selectedDate: string }) {
  const isToday = selectedDate === new Date().toLocaleDateString("en-CA")
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [expandedShiftId, setExpandedShiftId] = useState<number | null>(null)
  const [shiftOrders, setShiftOrders] = useState<Record<number, SaleRecord[]>>({})
  const [loadingOrdersFor, setLoadingOrdersFor] = useState<number | null>(null)
  const [orderFilter, setOrderFilter] = useState<Record<number, string>>({})
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null)
  const [editNotes, setEditNotes] = useState("")
  const [editEndBalance, setEditEndBalance] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [actionError, setActionError] = useState("")
  const [summaryShift, setSummaryShift] = useState<ShiftRecord | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const fetchShifts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ date: selectedDate })
      if (showArchived) params.set("include_archived", "true")
      const res = await fetch(`/api/shifts?${params}`)
      if (res.ok) { const j = await res.json(); setShifts(j.shifts ?? []) }
    } finally {
      setLoading(false)
    }
  }, [selectedDate, showArchived])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  const fetchShiftOrders = async (shiftId: number): Promise<SaleRecord[]> => {
    if (shiftOrders[shiftId] !== undefined) return shiftOrders[shiftId]
    setLoadingOrdersFor(shiftId)
    try {
      const res = await fetch(`/api/shifts/${shiftId}/sales`)
      if (res.ok) {
        const j = await res.json()
        const sales: SaleRecord[] = j.sales ?? []
        setShiftOrders(prev => ({ ...prev, [shiftId]: sales }))
        return sales
      }
    } finally {
      setLoadingOrdersFor(null)
    }
    return []
  }

  const handleViewOrders = async (shiftId: number) => {
    if (expandedShiftId === shiftId) { setExpandedShiftId(null); return }
    setExpandedShiftId(shiftId)
    await fetchShiftOrders(shiftId)
  }

  const handleOpenSummary = async (shift: ShiftRecord) => {
    setSummaryShift(shift)
    setSummaryOpen(true)
    await fetchShiftOrders(shift.id)
  }

  const handleArchive = async (shift: ShiftRecord) => {
    const res = await fetch(`/api/shifts/${shift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !shift.archived }),
    })
    if (res.ok) fetchShifts()
    else setActionError("Failed to update shift.")
  }

  const handleDelete = async (shift: ShiftRecord) => {
    if (!confirm(`Delete shift for ${shift.cashier_name}? This cannot be undone.`)) return
    const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" })
    if (res.ok) {
      fetchShifts()
      if (expandedShiftId === shift.id) setExpandedShiftId(null)
    } else {
      setActionError("Failed to delete shift.")
    }
  }

  const openEdit = (shift: ShiftRecord) => {
    setEditingShift(shift)
    setEditNotes(shift.notes ?? "")
    setEditEndBalance(shift.end_balance !== null ? String(shift.end_balance) : "")
  }

  const handleSaveEdit = async () => {
    if (!editingShift) return
    setEditSaving(true)
    const body: Record<string, unknown> = { notes: editNotes }
    if (editEndBalance !== "") body.end_balance = parseFloat(editEndBalance)
    const res = await fetch(`/api/shifts/${editingShift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setEditSaving(false)
    if (res.ok) { setEditingShift(null); fetchShifts() }
    else setActionError("Failed to save changes.")
  }

  const getFilter = (shiftId: number) => orderFilter[shiftId] ?? "all"
  const setFilter = (shiftId: number, f: string) =>
    setOrderFilter(prev => ({ ...prev, [shiftId]: f }))

  const getFilteredOrders = (shiftId: number) => {
    const orders = shiftOrders[shiftId] ?? []
    const f = getFilter(shiftId)
    return f === "all" ? orders : orders.filter(o => o.status === f)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{actionError}
          <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setActionError("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold">Shift Records — {isToday ? "Today" : selectedDate}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{shifts.length} shift{shifts.length !== 1 ? "s" : ""}</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Show Archived
          </label>
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
              const isExpanded = expandedShiftId === shift.id
              const orders = shiftOrders[shift.id]
              const filter = getFilter(shift.id)

              return (
                <div key={shift.id} className={shift.archived ? "opacity-60" : ""}>
                  {/* Shift row */}
                  <div className="p-4 hover:bg-gray-50/80">
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
                          {shift.archived && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-yellow-50 text-yellow-700 border-0">
                              Archived
                            </Badge>
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
                        {shift.notes && (
                          <p className="mt-2 text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1 italic flex items-center gap-1">
                            <FileText className="h-3 w-3 flex-shrink-0" />{shift.notes}
                          </p>
                        )}
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

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1.5 bg-primary/5 border-primary/30 hover:bg-primary/10 text-primary font-semibold"
                        onClick={() => handleOpenSummary(shift)}
                      >
                        <FileText className="h-3.5 w-3.5" />Full Summary
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => handleViewOrders(shift.id)}
                      >
                        {isExpanded
                          ? <><ChevronUp className="h-3.5 w-3.5" />Hide Orders</>
                          : <><ChevronDown className="h-3.5 w-3.5" />View Orders{orders !== undefined ? ` (${orders.length})` : ""}</>
                        }
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => openEdit(shift)}
                      >
                        <Pencil className="h-3.5 w-3.5" />Edit
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className={`h-7 text-xs gap-1.5 ${shift.archived ? "text-yellow-700 border-yellow-300 hover:bg-yellow-50" : "text-gray-600"}`}
                        onClick={() => handleArchive(shift)}
                      >
                        {shift.archived
                          ? <><ArchiveRestore className="h-3.5 w-3.5" />Unarchive</>
                          : <><Archive className="h-3.5 w-3.5" />Archive</>
                        }
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-7 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleDelete(shift)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />Delete
                      </Button>
                    </div>
                  </div>

                  {/* Expanded orders panel */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50/60 px-4 py-3">
                      {loadingOrdersFor === shift.id ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : !orders || orders.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No orders found for this shift.
                        </p>
                      ) : (
                        <>
                          {/* Filter tabs */}
                          <div className="flex gap-2 mb-3 flex-wrap">
                            {["all", "completed", "void", "cancelled"].map((f) => {
                              const count = f === "all" ? orders.length : orders.filter(o => o.status === f).length
                              return (
                                <button
                                  key={f}
                                  onClick={() => setFilter(shift.id, f)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filter === f
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-white border text-gray-600 hover:bg-gray-100"
                                  }`}
                                >
                                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                                </button>
                              )
                            })}
                          </div>

                          {/* Order rows */}
                          <div className="space-y-1.5">
                            {getFilteredOrders(shift.id).length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">No {filter} orders.</p>
                            ) : getFilteredOrders(shift.id).map((order) => (
                              <div
                                key={order.id}
                                className={`flex items-center gap-3 bg-white rounded-lg px-3 py-2 border text-xs ${order.status !== "completed" ? "opacity-60" : ""}`}
                              >
                                <span className="text-muted-foreground flex-shrink-0 w-14">
                                  {new Date(order.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                </span>
                                <span className="font-mono font-semibold flex-shrink-0">{order.order_number}</span>
                                <span className="flex-shrink-0 capitalize text-muted-foreground">
                                  <PaymentIcon method={order.payment_method} />{order.payment_method}
                                </span>
                                <span className="flex-1 text-muted-foreground truncate">
                                  {(order.items as any[])?.map((it: any) => `${it.quantity}× ${it.name}`).join(", ")}
                                </span>
                                <span className="font-mono font-semibold flex-shrink-0">{fmt(order.grand_total)}</span>
                                <OrderStatusBadge status={order.status} />
                                {order.void_reason && (
                                  <span className="text-muted-foreground italic truncate max-w-[120px]" title={order.void_reason}>
                                    "{order.void_reason}"
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Footer summary */}
                          <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground flex-wrap">
                            <span>Completed: <strong className="text-foreground">{orders.filter(o => o.status === "completed").length}</strong></span>
                            <span>Void: <strong className="text-foreground">{orders.filter(o => o.status === "void").length}</strong></span>
                            <span>Cancelled: <strong className="text-foreground">{orders.filter(o => o.status === "cancelled").length}</strong></span>
                            <span className="ml-auto">
                              Revenue: <strong className="text-foreground font-mono">
                                {fmt(orders.filter(o => o.status === "completed").reduce((s, o) => s + o.grand_total, 0))}
                              </strong>
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Full Summary Modal */}
      {summaryShift && (
        <ShiftSummaryModal
          open={summaryOpen}
          onOpenChange={(v) => { setSummaryOpen(v); if (!v) setSummaryShift(null) }}
          shift={summaryShift}
          sales={shiftOrders[summaryShift.id] ?? []}
        />
      )}

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingShift(null)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Edit Shift</h2>
                <p className="text-xs text-muted-foreground">
                  {editingShift.cashier_name} · {fmtTime(editingShift.start_time)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingShift(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {editingShift.status === "closed" && (
                <div className="space-y-1.5">
                  <Label>Actual Cash Correction (End Balance)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editEndBalance}
                    onChange={(e) => setEditEndBalance(e.target.value)}
                    placeholder={editingShift.end_balance !== null ? String(editingShift.end_balance) : "Enter corrected amount"}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {editingShift.end_balance !== null ? fmt(editingShift.end_balance) : "not set"}. Leave blank to keep unchanged.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this shift..."
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEditingShift(null)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Activity Log Section ─────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create_account:      { label: "Account Created",       icon: UserPlus,  color: "text-green-600 bg-green-50"  },
  reset_password:      { label: "Password Reset",        icon: KeySquare, color: "text-amber-600 bg-amber-50"  },
  delete_account:      { label: "Account Deleted",       icon: UserX,     color: "text-red-600 bg-red-50"      },
  update_account:      { label: "Account Updated",       icon: UserCog,   color: "text-blue-600 bg-blue-50"    },
  change_own_password: { label: "Own Password Changed",  icon: KeyRound,  color: "text-purple-600 bg-purple-50" },
}

function AuditLogSection({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="p-5 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Activity Log</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Recent account management actions by admins</p>
        </div>
        <span className="text-sm text-muted-foreground">{entries.length} event{entries.length !== 1 ? "s" : ""}</span>
      </div>
      {entries.length === 0 ? (
        <EmptyState icon={History} message="No account activity recorded yet." />
      ) : (
        <div className="divide-y">
          {entries.map((entry) => {
            const meta = ACTION_META[entry.action] ?? { label: entry.action, icon: History, color: "text-gray-600 bg-gray-50" }
            const Icon = meta.icon
            return (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50">
                <div className={`mt-0.5 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{meta.label}</span>
                    {entry.target_username && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        @{entry.target_username}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    by <span className="font-medium text-foreground">@{entry.actor_username}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.created_at).toLocaleString("en-PH", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "2-digit", minute: "2-digit", hour12: true,
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Security History Section ─────────────────────────────────────────────────

function SecurityHistorySection({
  entries,
  adminName,
  onChangePassword,
}: {
  entries: AuditEntry[]
  adminName: string
  onChangePassword: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold">My Security History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Password changes for your account ({adminName})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {entries.length} event{entries.length !== 1 ? "s" : ""}
            </span>
            <Button variant="outline" size="sm" className="gap-2" onClick={onChangePassword}>
              <KeyRound className="h-3.5 w-3.5" />
              Change Password
            </Button>
          </div>
        </div>
        {entries.length === 0 ? (
          <EmptyState icon={ShieldCheck} message="No password changes recorded for your account yet." />
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50">
                <div className="mt-0.5 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-purple-600 bg-purple-50">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">Password Changed</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString("en-PH", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "2-digit", minute: "2-digit", hour12: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

function StaffSection({ staff, onRefresh }: { staff: StaffUser[]; onRefresh: () => Promise<void> }) {
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null)
  const [resetUser, setResetUser] = useState<StaffUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const flash = (msg: string, type: "ok" | "err") => {
    if (type === "ok") { setSuccess(msg); setTimeout(() => setSuccess(""), 3000) }
    else { setError(msg); setTimeout(() => setError(""), 4000) }
  }

  const handleSave = async (data: { username: string; name: string; password: string; role: string }) => {
    setSaving(true)
    setError("")
    try {
      const isEdit = !!editingUser
      const res = await fetch("/api/users", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingUser.id, name: data.name, password: data.password || undefined } : data),
      })
      const json = await res.json()
      if (!res.ok) { flash(json.error ?? "Failed to save", "err"); return }
      await onRefresh()
      setShowModal(false)
      setEditingUser(null)
      flash(isEdit ? "Account updated." : `Account created. Password: ${data.password}`, "ok")
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (newPassword: string) => {
    if (!resetUser) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetUser.id, name: resetUser.name, password: newPassword }),
      })
      const json = await res.json()
      if (!res.ok) { flash(json.error ?? "Failed to reset password", "err"); return }
      setResetUser(null)
      flash(`Password reset for ${resetUser.name}.`, "ok")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: StaffUser) => {
    if (!confirm(`Delete "${user.name}" (@${user.username})? This cannot be undone.`)) return
    setDeletingId(user.id)
    setError("")
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      })
      const json = await res.json()
      if (!res.ok) { flash(json.error ?? "Failed to delete", "err"); return }
      await onRefresh()
      flash(`${user.name} removed.`, "ok")
    } finally {
      setDeletingId(null)
    }
  }

  const admins = staff.filter((u) => u.role === "admin")
  const cashiers = staff.filter((u) => u.role === "cashier")
  const sorted = [...admins, ...cashiers]

  return (
    <div className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Staff Accounts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{staff.length} account{staff.length !== 1 ? "s" : ""}</p>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => { setEditingUser(null); setShowModal(true) }}
          >
            <Plus className="h-4 w-4" />Add Staff
          </Button>
        </div>

        {sorted.length === 0 ? (
          <EmptyState icon={Users} message="No staff accounts found." />
        ) : (
          <div className="divide-y">
            {sorted.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
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
                <p className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                  Since {new Date(user.created_at).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-primary"
                    onClick={() => { setEditingUser(user); setShowModal(true) }}
                    title="Edit account"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-amber-600"
                    onClick={() => setResetUser(user)}
                    title="Reset password"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                    onClick={() => handleDelete(user)}
                    disabled={deletingId === user.id}
                    title="Delete account"
                  >
                    {deletingId === user.id
                      ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <StaffFormModal
          user={editingUser}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingUser(null) }}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          saving={saving}
          onSave={handleResetPassword}
          onClose={() => setResetUser(null)}
        />
      )}
    </div>
  )
}

// ─── Password strength helpers + Reset Password Modal ─────────────────────────

interface PasswordCriteria {
  label: string
  met: boolean
}

function getPasswordCriteria(pw: string): PasswordCriteria[] {
  return [
    { label: "At least 8 characters",  met: pw.length >= 8 },
    { label: "One uppercase letter",   met: /[A-Z]/.test(pw) },
    { label: "One number",             met: /[0-9]/.test(pw) },
    { label: "One special character",  met: /[^A-Za-z0-9]/.test(pw) },
  ]
}

function getStrengthScore(pw: string): number {
  return getPasswordCriteria(pw).filter((c) => c.met).length
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"]
const STRENGTH_COLORS = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"]
const STRENGTH_TEXT   = ["", "text-red-600", "text-orange-500", "text-yellow-600", "text-green-600"]

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null
  const score = getStrengthScore(password)
  const criteria = getPasswordCriteria(password)
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? STRENGTH_COLORS[score] : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${score === 4 ? "text-green-600" : STRENGTH_TEXT[score] || "text-gray-500"}`}>
        {score === 4 ? "Strong — all requirements met" : STRENGTH_LABELS[score] || "Very Weak"}
      </p>
      <ul className="space-y-0.5">
        {criteria.map((c) => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.met ? "text-green-600" : "text-muted-foreground"}`}>
            <CheckCircle className={`h-3 w-3 flex-shrink-0 ${c.met ? "text-green-500" : "text-gray-300"}`} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResetPasswordModal({
  user, saving, onSave, onClose,
}: {
  user: StaffUser
  saving: boolean
  onSave: (newPassword: string) => void
  onClose: () => void
}) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [validationError, setValidationError] = useState("")

  const score = getStrengthScore(password)
  const isStrong = score === 4

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError("")
    if (!isStrong) {
      setValidationError("Password does not meet all strength requirements.")
      return
    }
    if (password !== confirm) {
      setValidationError("Passwords do not match.")
      return
    }
    onSave(password.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl p-6 mx-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">Reset Password</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Set a new password for <span className="font-medium text-foreground">{user.name}</span> (@{user.username}). No current password required.
        </p>
        {validationError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />{validationError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={password} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || !isStrong} className="flex-1 gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Reset Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Staff Form Modal ─────────────────────────────────────────────────────────

function StaffFormModal({
  user, saving, onSave, onClose,
}: {
  user: StaffUser | null
  saving: boolean
  onSave: (data: { username: string; name: string; password: string; role: string }) => void
  onClose: () => void
}) {
  const isEdit = !!user
  const [username, setUsername] = useState(user?.username ?? "")
  const [name, setName] = useState(user?.name ?? "")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState(user?.role ?? "cashier")
  const [showPw, setShowPw] = useState(false)

  const score = getStrengthScore(password)
  const isStrong = score === 4
  const passwordEntered = password.trim().length > 0
  const canSubmit = isEdit ? (!passwordEntered || isStrong) : isStrong

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSave({ username, name, password, role })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Account" : "Add Staff Account"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. cashier5"
              required
              disabled={isEdit}
              className={isEdit ? "bg-gray-50 text-gray-500" : ""}
            />
            {isEdit && <p className="text-xs text-muted-foreground">Username cannot be changed.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cashier 5"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isEdit ? "New Password (leave blank to keep current)" : "Password"}</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Enter new password to change" : "Set a password"}
                required={!isEdit}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordEntered && <PasswordStrengthMeter password={password} />}
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || !canSubmit} className="flex-1 gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Account"}
            </Button>
          </div>
        </form>
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
