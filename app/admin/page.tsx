"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, RefreshCw, ShoppingBag, TrendingUp, Wallet, CreditCard, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface DailyStats {
  total_orders: number
  total_sales: number
  total_subtotal: number
  total_service_charge: number
}

interface PaymentBreakdown {
  payment_method: string
  count: number
  total: number
}

interface RecentOrder {
  id: number
  order_number: string
  items: Array<{ id: number; name: string; price: number; quantity: number }>
  subtotal: number
  service_charge: number
  grand_total: number
  payment_method: string
  server_name: string
  created_by: string
  created_at: string
}

interface SalesData {
  date: string
  stats: DailyStats
  paymentBreakdown: PaymentBreakdown[]
  recentOrders: RecentOrder[]
}

function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function paymentIcon(method: string) {
  if (method === "cash") return <Wallet className="h-3 w-3 inline mr-1" />
  if (method === "card") return <CreditCard className="h-3 w-3 inline mr-1" />
  return (
    <svg className="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [data, setData] = useState<SalesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA")
  )

  const isAdmin = session?.user?.role === "admin"

  const fetchData = async (date: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/sales?date=${date}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error("Failed to fetch sales data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      fetchData(selectedDate)
    }
  }, [selectedDate, status, isAdmin])

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Coron Grill Diners — Sales Overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-white"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchData(selectedDate)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-32">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Daily Sales</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(data.stats.total_sales)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedDate === new Date().toLocaleDateString("en-CA") ? "Today" : selectedDate}
                </p>
              </div>

              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Orders</span>
                </div>
                <p className="text-3xl font-bold">{data.stats.total_orders}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.stats.total_orders === 1 ? "order" : "orders"} completed
                </p>
              </div>

              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm font-medium">Avg. Order Value</span>
                </div>
                <p className="text-3xl font-bold">
                  {data.stats.total_orders > 0
                    ? formatCurrency(data.stats.total_sales / data.stats.total_orders)
                    : "₱0.00"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">per transaction</p>
              </div>
            </div>

            {data.paymentBreakdown.length > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm mb-6">
                <h2 className="font-semibold mb-3">Payment Method Breakdown</h2>
                <div className="space-y-2">
                  {data.paymentBreakdown.map((p) => (
                    <div key={p.payment_method} className="flex items-center justify-between">
                      <span className="text-sm capitalize flex items-center">
                        {paymentIcon(p.payment_method)}
                        {p.payment_method} ({p.count} {p.count === 1 ? "order" : "orders"})
                      </span>
                      <span className="font-medium text-sm">{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-5 border-b">
                <h2 className="font-semibold">Recent Orders</h2>
              </div>
              {data.recentOrders.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No orders recorded for this date</p>
                </div>
              ) : (
                <div className="divide-y">
                  {data.recentOrders.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm">{order.order_number}</span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                              {paymentIcon(order.payment_method)}
                              {order.payment_method}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTime(order.created_at)} · Served by: <span className="font-medium">{order.created_by || order.server_name}</span>
                          </p>
                          <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                            {order.items.map((item, i) => (
                              <span key={i} className="mr-2">
                                {item.quantity}× {item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="font-bold text-green-600">{formatCurrency(order.grand_total)}</p>
                          {order.service_charge > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              incl. {formatCurrency(order.service_charge)} svc
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            Failed to load data. Please refresh.
          </div>
        )}
      </div>
    </div>
  )
}
