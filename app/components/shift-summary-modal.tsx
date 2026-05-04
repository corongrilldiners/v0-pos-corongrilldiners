"use client"

import { useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle, AlertTriangle, TrendingUp, TrendingDown,
  Wallet, CreditCard, FileSpreadsheet, FileText, X, Ban,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftRecord {
  id: number
  cashier_name: string
  cashier_username: string
  start_time: string
  end_time: string | null
  status: "open" | "closed"
  archived: boolean
  notes: string | null
  start_balance: number
  end_balance: number | null
  total_cash_sales: number
  total_sales: number
  expected_cash: number | null
  discrepancy: number | null
}

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

interface ShiftSummaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: ShiftRecord
  sales: SaleRecord[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₱${(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
}

function getPaymentBreakdown(sales: SaleRecord[]) {
  const completed = sales.filter(s => s.status === "completed")
  const map: Record<string, { count: number; total: number }> = {}
  for (const s of completed) {
    if (!map[s.payment_method]) map[s.payment_method] = { count: 0, total: 0 }
    map[s.payment_method].count++
    map[s.payment_method].total += s.grand_total
  }
  return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
}

function itemsStr(items: Array<{ name: string; quantity: number }>) {
  return items?.map(i => `${i.quantity}x ${i.name}`).join(", ") || ""
}

function PaymentIcon({ method }: { method: string }) {
  if (method === "cash") return <Wallet className="h-3.5 w-3.5 inline mr-1 text-green-600" />
  if (method === "card") return <CreditCard className="h-3.5 w-3.5 inline mr-1 text-blue-600" />
  return <span className="mr-1 text-[10px] font-bold text-purple-600">G</span>
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

// ─── Excel Export ─────────────────────────────────────────────────────────────

async function downloadExcel(shift: ShiftRecord, sales: SaleRecord[]) {
  const XLSX = await import("xlsx")

  const disc = shift.discrepancy ?? 0
  const discLabel = disc > 0 ? "Overage" : disc < 0 ? "Shortage" : "Balanced"
  const shiftDate = new Date(shift.start_time).toLocaleDateString("en-CA")
  const payBreak = getPaymentBreakdown(sales)
  const completed = sales.filter(s => s.status === "completed")
  const voided = sales.filter(s => s.status === "void")
  const cancelled = sales.filter(s => s.status === "cancelled")
  const otherSales = shift.total_sales - shift.total_cash_sales

  // ── Sheet 1: Summary ─────────────────────────────────────────────────────
  const summaryRows: (string | number)[][] = [
    ["CORON GRILL DINERS — SHIFT SUMMARY REPORT"],
    [],
    ["Cashier", shift.cashier_name],
    ["Username", `@${shift.cashier_username}`],
    ["Date", fmtDate(shift.start_time)],
    ["Shift Start", fmtTime(shift.start_time)],
    ["Shift End", shift.end_time ? fmtTime(shift.end_time) : "Ongoing"],
    ["Shift Status", shift.status === "open" ? "Active" : "Closed"],
    [],
    ["── FINANCIAL OVERVIEW ──"],
    ["Starting Cash", shift.start_balance],
    ["Cash Sales", shift.total_cash_sales],
    ["Other Payment Sales", otherSales],
    ["Total Sales", shift.total_sales],
  ]

  if (shift.status === "closed") {
    summaryRows.push(
      ["Expected Cash in Drawer", shift.expected_cash ?? 0],
      ["Actual Cash Counted", shift.end_balance ?? 0],
      [`${discLabel}`, Math.abs(disc)],
    )
  }

  summaryRows.push(
    [],
    ["── PAYMENT METHOD BREAKDOWN ──"],
    ["Payment Method", "Orders", "Total Amount"],
  )
  for (const [method, { count, total }] of payBreak) {
    summaryRows.push([method.charAt(0).toUpperCase() + method.slice(1), count, total])
  }

  summaryRows.push(
    [],
    ["── ORDER COUNTS ──"],
    ["Completed Orders", completed.length],
    ["Voided Orders", voided.length],
    ["Cancelled Orders", cancelled.length],
    ["Total Orders", sales.length],
  )

  if (shift.notes) {
    summaryRows.push([], ["Notes", shift.notes])
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)

  wsSummary["!cols"] = [{ wch: 30 }, { wch: 25 }, { wch: 20 }]
  wsSummary["A1"] = { v: "CORON GRILL DINERS — SHIFT SUMMARY REPORT", t: "s" }

  // Format currency cells
  const currencyFmt = '₱#,##0.00'
  const currencyCells = ["B11", "B12", "B13", "B14", "B15", "B16", "B17"]
  currencyCells.forEach(cell => {
    if (wsSummary[cell]) {
      wsSummary[cell].z = currencyFmt
    }
  })

  // ── Sheet 2: Order List ───────────────────────────────────────────────────
  const orderHeaders = ["#", "Order No.", "Time", "Items", "Payment Method", "Subtotal", "Service Charge", "Total", "Status", "Void Reason"]
  const orderRows = sales.map((s, i) => [
    i + 1,
    s.order_number,
    fmtDateTime(s.created_at),
    itemsStr(s.items),
    s.payment_method.charAt(0).toUpperCase() + s.payment_method.slice(1),
    s.subtotal,
    s.service_charge,
    s.grand_total,
    s.status.charAt(0).toUpperCase() + s.status.slice(1),
    s.void_reason ?? "",
  ])

  const wsOrders = XLSX.utils.aoa_to_sheet([orderHeaders, ...orderRows])
  wsOrders["!cols"] = [
    { wch: 4 }, { wch: 14 }, { wch: 20 }, { wch: 50 },
    { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsSummary, "Shift Summary")
  XLSX.utils.book_append_sheet(wb, wsOrders, "Order List")

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `Shift_${shift.cashier_username}_${shiftDate}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Word Export ──────────────────────────────────────────────────────────────

async function downloadDocx(shift: ShiftRecord, sales: SaleRecord[]) {
  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    WidthType, TextRun, HeadingLevel, AlignmentType, BorderStyle,
    ShadingType,
  } = await import("docx")

  const disc = shift.discrepancy ?? 0
  const discLabel = disc > 0 ? "Overage" : disc < 0 ? "Shortage" : "Balanced"
  const shiftDate = new Date(shift.start_time).toLocaleDateString("en-CA")
  const payBreak = getPaymentBreakdown(sales)
  const completed = sales.filter(s => s.status === "completed")
  const voided = sales.filter(s => s.status === "void")
  const cancelled = sales.filter(s => s.status === "cancelled")
  const otherSales = shift.total_sales - shift.total_cash_sales

  const bold = (text: string) => new TextRun({ text, bold: true })
  const normal = (text: string) => new TextRun({ text })
  const mono = (text: string) => new TextRun({ text, font: "Courier New" })

  const cell = (text: string, opts: { bold?: boolean; shade?: boolean; right?: boolean } = {}) =>
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text, bold: opts.bold, font: opts.bold ? undefined : undefined })],
        alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
      })],
      shading: opts.shade ? { type: ShadingType.CLEAR, fill: "E8E8E8" } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    })

  const headerRow = (cols: string[]) =>
    new TableRow({
      children: cols.map(c => cell(c, { bold: true, shade: true })),
      tableHeader: true,
    })

  const dataRow = (cols: string[]) =>
    new TableRow({ children: cols.map(c => cell(c)) })

  // Summary table
  const summaryData: [string, string][] = [
    ["Cashier", shift.cashier_name],
    ["Username", `@${shift.cashier_username}`],
    ["Date", fmtDate(shift.start_time)],
    ["Shift Start", fmtTime(shift.start_time)],
    ["Shift End", shift.end_time ? fmtTime(shift.end_time) : "Ongoing"],
    ["Status", shift.status === "open" ? "Active" : "Closed"],
    ["", ""],
    ["Starting Cash", fmt(shift.start_balance)],
    ["Cash Sales", fmt(shift.total_cash_sales)],
    ["Other Payment Sales", fmt(otherSales)],
    ["Total Sales", fmt(shift.total_sales)],
  ]

  if (shift.status === "closed") {
    summaryData.push(
      ["Expected Cash in Drawer", fmt(shift.expected_cash ?? 0)],
      ["Actual Cash Counted", fmt(shift.end_balance ?? 0)],
      [discLabel, fmt(Math.abs(disc))],
    )
  }

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: summaryData.map(([label, value]) =>
      new TableRow({
        children: [
          cell(label, { bold: true }),
          cell(value),
        ],
      })
    ),
  })

  // Payment breakdown table
  const payTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      headerRow(["Payment Method", "Orders", "Total Amount"]),
      ...payBreak.map(([method, { count, total }]) =>
        dataRow([
          method.charAt(0).toUpperCase() + method.slice(1),
          String(count),
          fmt(total),
        ])
      ),
      dataRow(["TOTAL", String(completed.length), fmt(shift.total_sales)]),
    ],
  })

  // Order list table
  const orderTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      headerRow(["Order No.", "Time", "Items", "Payment", "Total", "Status", "Void Reason"]),
      ...sales.map(s =>
        dataRow([
          s.order_number,
          fmtDateTime(s.created_at),
          itemsStr(s.items),
          s.payment_method.charAt(0).toUpperCase() + s.payment_method.slice(1),
          fmt(s.grand_total),
          s.status.charAt(0).toUpperCase() + s.status.slice(1),
          s.void_reason ?? "",
        ])
      ),
    ],
  })

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [bold("CORON GRILL DINERS")],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [normal("Beside Panda House, 1 Don Pedro St, Barangay Poblacion, Coron")],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [bold("SHIFT SUMMARY REPORT")],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ children: [] }),
        new Paragraph({ children: [bold("Shift Information")] }),
        new Paragraph({ children: [] }),
        summaryTable,
        new Paragraph({ children: [] }),
        new Paragraph({ children: [bold("Payment Method Breakdown")] }),
        new Paragraph({ children: [] }),
        payTable,
        new Paragraph({ children: [] }),
        new Paragraph({ children: [bold("Order Counts")] }),
        new Paragraph({ children: [normal(`Completed: ${completed.length}    Voided: ${voided.length}    Cancelled: ${cancelled.length}    Total: ${sales.length}`)] }),
        ...(shift.notes ? [
          new Paragraph({ children: [] }),
          new Paragraph({ children: [bold("Notes")] }),
          new Paragraph({ children: [normal(shift.notes)] }),
        ] : []),
        new Paragraph({ children: [] }),
        new Paragraph({ children: [bold("Order List")] }),
        new Paragraph({ children: [] }),
        orderTable,
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [normal(`Report generated: ${new Date().toLocaleString("en-PH")}`)],
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `Shift_${shift.cashier_username}_${shiftDate}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Modal Component ──────────────────────────────────────────────────────────

export default function ShiftSummaryModal({ open, onOpenChange, shift, sales }: ShiftSummaryModalProps) {
  const disc = shift.discrepancy ?? 0
  const isOver = shift.status === "closed" && disc > 0
  const isShort = shift.status === "closed" && disc < 0
  const isExact = shift.status === "closed" && disc === 0
  const isOpen = shift.status === "open"

  const completed = sales.filter(s => s.status === "completed")
  const voided = sales.filter(s => s.status === "void")
  const cancelled = sales.filter(s => s.status === "cancelled")
  const payBreak = getPaymentBreakdown(sales)
  const otherSales = shift.total_sales - shift.total_cash_sales

  const handleExcelDownload = useCallback(() => downloadExcel(shift, sales), [shift, sales])
  const handleDocxDownload = useCallback(() => downloadDocx(shift, sales), [shift, sales])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Shift Report — {shift.cashier_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {fmtDate(shift.start_time)} · {fmtTime(shift.start_time)}
            {shift.end_time ? ` → ${fmtTime(shift.end_time)}` : " (ongoing)"}
            {" · "}@{shift.cashier_username}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-1">

          {/* ── Financial Overview ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financial Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <OverviewCard label="Starting Cash" value={fmt(shift.start_balance)} />
              <OverviewCard label="Cash Sales" value={fmt(shift.total_cash_sales)} valueClass="text-green-600" />
              <OverviewCard label="Other Sales" value={fmt(otherSales)} valueClass="text-blue-600" />
              <OverviewCard label="Total Sales" value={fmt(shift.total_sales)} valueClass="font-bold text-base" />
              {!isOpen && (
                <>
                  <OverviewCard label="Expected Cash" value={fmt(shift.expected_cash ?? 0)} />
                  <OverviewCard label="Actual Cash" value={fmt(shift.end_balance ?? 0)} />
                </>
              )}
            </div>
            {!isOpen && (
              <div className={`mt-3 rounded-lg px-4 py-3 flex items-center justify-between ${isExact ? "bg-green-50 border border-green-200" : isOver ? "bg-blue-50 border border-blue-200" : "bg-red-50 border border-red-200"}`}>
                <div className={`flex items-center gap-2 font-semibold ${isExact ? "text-green-700" : isOver ? "text-blue-700" : "text-red-700"}`}>
                  {isExact
                    ? <CheckCircle className="h-4 w-4" />
                    : isOver
                    ? <TrendingUp className="h-4 w-4" />
                    : <TrendingDown className="h-4 w-4" />
                  }
                  <span>{isExact ? "Balanced" : isOver ? "Overage" : "Shortage"}</span>
                </div>
                <span className={`font-mono font-bold text-base ${isExact ? "text-green-700" : isOver ? "text-blue-700" : "text-red-700"}`}>
                  {disc >= 0 ? "+" : "-"}{fmt(Math.abs(disc))}
                </span>
              </div>
            )}
            {isOpen && (
              <div className="mt-3 rounded-lg px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />Shift currently active
              </div>
            )}
          </section>

          <Separator />

          {/* ── Payment Breakdown ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment Method Breakdown</h3>
            {payBreak.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed sales recorded.</p>
            ) : (
              <div className="space-y-2">
                {payBreak.map(([method, { count, total }]) => (
                  <div key={method} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium capitalize flex items-center">
                      <PaymentIcon method={method} />
                      {method} <span className="text-muted-foreground ml-1.5 font-normal">({count} order{count !== 1 ? "s" : ""})</span>
                    </span>
                    <span className="font-mono font-semibold text-sm">{fmt(total)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t pt-2 px-3">
                  <span className="text-sm font-semibold">Total Revenue</span>
                  <span className="font-mono font-bold text-sm">{fmt(shift.total_sales)}</span>
                </div>
              </div>
            )}
          </section>

          <Separator />

          {/* ── Order Counts ───────────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CountCard label="Total Orders" count={sales.length} color="bg-gray-50 border" />
              <CountCard label="Completed" count={completed.length} color="bg-green-50 border-green-200 border text-green-700" />
              <CountCard label="Voided" count={voided.length} color="bg-red-50 border-red-200 border text-red-700" />
              <CountCard label="Cancelled" count={cancelled.length} color="bg-gray-100 border text-gray-600" />
            </div>
          </section>

          {shift.notes && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground italic bg-gray-50 rounded-lg px-3 py-2">{shift.notes}</p>
              </section>
            </>
          )}

          <Separator />

          {/* ── Order List ─────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              All Orders ({sales.length})
            </h3>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No orders found for this shift.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Time</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Order #</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Items</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Payment</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sales.map((order) => (
                        <tr
                          key={order.id}
                          className={`hover:bg-gray-50/80 ${order.status !== "completed" ? "opacity-55" : ""}`}
                        >
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {new Date(order.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{order.order_number}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[220px] truncate" title={itemsStr(order.items)}>
                            {itemsStr(order.items)}
                          </td>
                          <td className="px-3 py-2 capitalize whitespace-nowrap">
                            <PaymentIcon method={order.payment_method} />
                            {order.payment_method}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-right whitespace-nowrap">{fmt(order.grand_total)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <StatusBadge status={order.status} />
                            {order.void_reason && (
                              <span className="ml-1 text-muted-foreground italic" title={order.void_reason}>
                                — {order.void_reason}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t font-semibold">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-sm">Revenue (completed orders)</td>
                        <td className="px-3 py-2 font-mono text-right text-sm text-green-700">
                          {fmt(completed.reduce((s, o) => s + o.grand_total, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ── Export Buttons ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              className="flex-1 gap-2 bg-green-700 hover:bg-green-800 text-white"
              onClick={handleExcelDownload}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel (.xlsx)
            </Button>
            <Button
              className="flex-1 gap-2 bg-blue-700 hover:bg-blue-800 text-white"
              onClick={handleDocxDownload}
            >
              <FileText className="h-4 w-4" />
              Export Word (.docx)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function OverviewCard({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg border px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-mono font-semibold text-sm ${valueClass}`}>{value}</p>
    </div>
  )
}

function CountCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${color}`}>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-lg leading-tight">{count}</p>
    </div>
  )
}
