"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Printer, RefreshCw, CheckCircle, X, AlertTriangle, Wallet, CreditCard,
  TrendingUp, ShoppingBag, Ban,
} from "lucide-react"

interface SaleRecord {
  id: string
  order_number: string
  items: Array<{ name: string; quantity: number; price: number }>
  subtotal: number
  service_charge: number
  grand_total: number
  payment_method: string
  server_name: string
  created_by: string
  status: string
  void_reason: string | null
  created_at: string
}

interface StatRow {
  status: string
  count: number
  total: number
}

interface SummaryData {
  date: string
  cashier: string
  stats: StatRow[]
  orders: SaleRecord[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cashierName: string
}

function fmt(n: number) {
  return `₱${(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true })
}

function PaymentIcon({ method }: { method: string }) {
  if (method === "cash") return <Wallet className="h-3 w-3 inline mr-0.5" />
  if (method === "card") return <CreditCard className="h-3 w-3 inline mr-0.5" />
  return <span className="mr-0.5 text-[10px] font-bold">G</span>
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
      <CheckCircle className="h-2.5 w-2.5" />Done
    </span>
  )
  if (status === "void") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
      <X className="h-2.5 w-2.5" />Void
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
      <Ban className="h-2.5 w-2.5" />Cancelled
    </span>
  )
}

export default function CashierSummaryDialog({ open, onOpenChange, cashierName }: Props) {
  const today = new Date().toLocaleDateString("en-CA")
  const [date, setDate] = useState(today)
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState<Record<string, string>>({})
  const [voidConfirm, setVoidConfirm] = useState<string | null>(null)
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/sales/my?date=${date}`)
      if (res.ok) setData(await res.json())
      else setError("Failed to load summary.")
    } catch {
      setError("Failed to load summary.")
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])

  const getStat = (status: string) => data?.stats.find(s => s.status === status)
  const completedStat = getStat("completed")
  const voidStat = getStat("void")
  const cancelledStat = getStat("cancelled")

  const filteredOrders = (data?.orders ?? []).filter(o =>
    statusFilter === "all" || o.status === statusFilter
  )

  const handleVoid = async (orderId: string) => {
    setVoidingId(orderId)
    const res = await fetch(`/api/sales/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "void", voidReason: voidReason[orderId] ?? "" }),
    })
    setVoidingId(null)
    setVoidConfirm(null)
    if (res.ok) {
      fetchData()
    } else {
      setError("Failed to void order.")
    }
  }

  const handlePrint = () => {
    if (!data) return

    const printWindow = window.open("", "_blank", "width=850,height=700")
    if (!printWindow) {
      alert("Allow pop-ups to print your summary.")
      return
    }

    const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })

    const completedOrders = data.orders.filter(o => o.status === "completed")
    const voidOrders = data.orders.filter(o => o.status === "void")
    const cancelledOrders = data.orders.filter(o => o.status === "cancelled")
    const totalRevenue = completedOrders.reduce((s, o) => s + o.grand_total, 0)

    const orderRows = (orders: SaleRecord[], showReason = false) =>
      orders.map(o => `
        <tr>
          <td>${fmtTime(o.created_at)}</td>
          <td><strong>${o.order_number}</strong></td>
          <td style="text-transform:capitalize">${o.payment_method}</td>
          <td>${(o.items as any[])?.map((it: any) => `${it.quantity}× ${it.name}`).join(", ")}</td>
          <td style="text-align:right;font-family:monospace">₱${o.grand_total.toFixed(2)}</td>
          ${showReason ? `<td style="color:#666;font-style:italic">${o.void_reason ?? ""}</td>` : ""}
        </tr>
      `).join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Summary — ${cashierName} — ${date}</title>
        <style>
          @page { size: auto; margin: 2cm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
          .header { margin-bottom: 20px; }
          .meta { color: #555; font-size: 11px; }
          .stats { display: flex; gap: 20px; margin-bottom: 20px; }
          .stat-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; flex: 1; }
          .stat-box .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .stat-box .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
          .stat-box .sub { font-size: 11px; color: #555; margin-top: 2px; }
          .green { color: #16a34a; }
          .red { color: #dc2626; }
          .gray { color: #6b7280; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; padding: 6px 8px; background: #f5f5f5; border-bottom: 2px solid #ddd; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
          tr:last-child td { border-bottom: none; }
          .footer { margin-top: 30px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sales Summary Report</h1>
          <div class="meta">
            <strong>Cashier:</strong> ${cashierName} &nbsp;|&nbsp;
            <strong>Date:</strong> ${dateLabel} &nbsp;|&nbsp;
            <strong>Printed:</strong> ${new Date().toLocaleString("en-PH")}
          </div>
          <div style="margin-top:6px;font-size:11px;color:#888">Coron Grill Diners — Beside Panda House, 1 Don Pedro St, Barangay Poblacion, Coron</div>
        </div>

        <div class="stats">
          <div class="stat-box">
            <div class="label">Completed Orders</div>
            <div class="value green">${completedOrders.length}</div>
            <div class="sub">₱${totalRevenue.toFixed(2)} revenue</div>
          </div>
          <div class="stat-box">
            <div class="label">Void Orders</div>
            <div class="value red">${voidOrders.length}</div>
            <div class="sub">₱${voidOrders.reduce((s, o) => s + o.grand_total, 0).toFixed(2)} forfeited</div>
          </div>
          <div class="stat-box">
            <div class="label">Cancelled Orders</div>
            <div class="value gray">${cancelledOrders.length}</div>
            <div class="sub">₱${cancelledOrders.reduce((s, o) => s + o.grand_total, 0).toFixed(2)} cancelled</div>
          </div>
          <div class="stat-box">
            <div class="label">Total Orders</div>
            <div class="value">${data.orders.length}</div>
            <div class="sub">all statuses</div>
          </div>
        </div>

        ${completedOrders.length > 0 ? `
        <h2>Completed Orders (${completedOrders.length})</h2>
        <table>
          <thead><tr><th>Time</th><th>Order #</th><th>Payment</th><th>Items</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${orderRows(completedOrders)}</tbody>
          <tfoot><tr>
            <td colspan="4" style="font-weight:bold;padding-top:8px">Total Revenue</td>
            <td style="text-align:right;font-weight:bold;font-family:monospace;padding-top:8px">₱${totalRevenue.toFixed(2)}</td>
          </tr></tfoot>
        </table>
        ` : ""}

        ${voidOrders.length > 0 ? `
        <h2>Void Orders (${voidOrders.length})</h2>
        <table>
          <thead><tr><th>Time</th><th>Order #</th><th>Payment</th><th>Items</th><th style="text-align:right">Amount</th><th>Reason</th></tr></thead>
          <tbody>${orderRows(voidOrders, true)}</tbody>
        </table>
        ` : ""}

        ${cancelledOrders.length > 0 ? `
        <h2>Cancelled Orders (${cancelledOrders.length})</h2>
        <table>
          <thead><tr><th>Time</th><th>Order #</th><th>Payment</th><th>Items</th><th style="text-align:right">Amount</th><th>Reason</th></tr></thead>
          <tbody>${orderRows(cancelledOrders, true)}</tbody>
        </table>
        ` : ""}

        <div class="footer">End of Report — Coron Grill Diners POS System</div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 400)
  }

  const totalOrders = data?.orders.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            My Sales Summary
          </DialogTitle>
          <DialogDescription>
            {cashierName} — daily order breakdown and totals
          </DialogDescription>
        </DialogHeader>

        {/* Date picker + actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-white flex-1"
          />
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data || loading} className="gap-2">
            <Printer className="h-4 w-4" />Print Summary
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex-shrink-0">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? null : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Completed</p>
                <p className="text-xl font-bold text-green-700 mt-0.5">{completedStat?.count ?? 0}</p>
                <p className="text-xs text-green-600 font-mono mt-0.5">{fmt(completedStat?.total ?? 0)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wide">Void</p>
                <p className="text-xl font-bold text-red-700 mt-0.5">{voidStat?.count ?? 0}</p>
                <p className="text-xs text-red-600 font-mono mt-0.5">{fmt(voidStat?.total ?? 0)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Cancelled</p>
                <p className="text-xl font-bold text-gray-700 mt-0.5">{cancelledStat?.count ?? 0}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{fmt(cancelledStat?.total ?? 0)}</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">Total</p>
                <p className="text-xl font-bold mt-0.5">{totalOrders}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">all orders</p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              {["all", "completed", "void", "cancelled"].map((f) => {
                const count = f === "all" ? totalOrders : (data.orders.filter(o => o.status === f).length)
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      statusFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                  </button>
                )
              })}
            </div>

            {/* Orders list */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No {statusFilter === "all" ? "" : statusFilter} orders for this date.</p>
                </div>
              ) : filteredOrders.map((order) => (
                <div key={order.id} className={`border rounded-lg px-3 py-2.5 bg-white ${order.status !== "completed" ? "opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm">{order.order_number}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          <PaymentIcon method={order.payment_method} />{order.payment_method}
                        </span>
                        <StatusBadge status={order.status} />
                        <span className="text-xs text-muted-foreground">{fmtTime(order.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {(order.items as any[])?.map((it: any) => `${it.quantity}× ${it.name}`).join(", ")}
                      </p>
                      {order.void_reason && (
                        <p className="text-xs text-red-500 italic mt-0.5">Reason: {order.void_reason}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <p className="font-bold text-sm font-mono">{fmt(order.grand_total)}</p>
                      {order.status === "completed" && (
                        voidConfirm === order.id ? (
                          <div className="flex flex-col gap-1 items-end">
                            <input
                              type="text"
                              placeholder="Void reason (optional)"
                              value={voidReason[order.id] ?? ""}
                              onChange={(e) => setVoidReason(prev => ({ ...prev, [order.id]: e.target.value }))}
                              className="border rounded px-2 py-0.5 text-xs w-36"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 text-[10px] px-2"
                                onClick={() => handleVoid(order.id)}
                                disabled={voidingId === order.id}
                              >
                                {voidingId === order.id ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : "Confirm Void"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2"
                                onClick={() => setVoidConfirm(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setVoidConfirm(order.id)}
                          >
                            Void
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total revenue footer */}
            <div className="flex-shrink-0 border-t pt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Revenue (completed)</span>
              <span className="text-lg font-bold text-green-600 font-mono">
                {fmt(data.orders.filter(o => o.status === "completed").reduce((s, o) => s + o.grand_total, 0))}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
