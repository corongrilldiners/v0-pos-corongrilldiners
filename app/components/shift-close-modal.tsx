"use client"

import { useState } from "react"
import { Wallet, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Loader2, Printer } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { Shift } from "@/hooks/use-shift"

interface ShiftCloseModalProps {
  open: boolean
  shift: Shift
  onClose: (endBalance: number) => Promise<Shift | null>
  onOpenChange: (open: boolean) => void
}

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true })
}

export default function ShiftCloseModal({ open, shift, onClose, onOpenChange }: ShiftCloseModalProps) {
  const [actualCash, setActualCash] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [closedShift, setClosedShift] = useState<Shift | null>(null)
  const [error, setError] = useState("")

  const amount = parseFloat(actualCash) || 0
  // Preview expected cash (estimated based on current shift data; server will recalculate precisely)
  const estimatedExpected = shift.start_balance + (shift.total_cash_sales || 0)
  const estimatedDiscrepancy = actualCash !== "" ? amount - estimatedExpected : null

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isNaN(amount) || amount < 0) {
      setError("Please enter a valid cash amount.")
      return
    }
    setError("")
    setIsLoading(true)
    const result = await onClose(amount)
    setIsLoading(false)
    if (result) {
      setClosedShift(result)
    } else {
      setError("Failed to close shift. Please try again.")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDone = () => {
    setClosedShift(null)
    setActualCash("")
    onOpenChange(false)
  }

  if (closedShift) {
    const disc = closedShift.discrepancy ?? 0
    const isOver = disc > 0
    const isShort = disc < 0
    const isExact = disc === 0

    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-sm print:shadow-none"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton
        >
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center ${isExact ? "bg-green-100" : isOver ? "bg-blue-100" : "bg-red-100"}`}>
                {isExact ? (
                  <CheckCircle className="h-7 w-7 text-green-600" />
                ) : isOver ? (
                  <TrendingUp className="h-7 w-7 text-blue-600" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-red-600" />
                )}
              </div>
            </div>
            <DialogTitle className="text-center">Shift Closed</DialogTitle>
            <DialogDescription className="text-center text-xs">
              {closedShift.cashier_name} · {formatTime(closedShift.start_time)} – {closedShift.end_time ? formatTime(closedShift.end_time) : "now"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm mt-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Starting Cash</span><span className="font-mono">{fmt(closedShift.start_balance)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cash Sales</span><span className="font-mono text-green-600">+{fmt(closedShift.total_cash_sales)}</span></div>
            <div className="flex justify-between font-medium border-t pt-2"><span>Expected Cash</span><span className="font-mono">{fmt(closedShift.expected_cash ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Actual Cash</span><span className="font-mono">{fmt(closedShift.end_balance ?? 0)}</span></div>
            <Separator />
            <div className={`flex justify-between font-bold text-base rounded-lg px-3 py-2 ${isExact ? "bg-green-50 text-green-700" : isOver ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
              <span>{isOver ? "Overage" : isShort ? "Shortage" : "Balanced"}</span>
              <span className="font-mono">{isOver ? "+" : isShort ? "-" : ""}{fmt(Math.abs(disc))}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>Total Sales (all methods)</span>
              <span className="font-mono">{fmt(closedShift.total_sales)}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />Print
            </Button>
            <Button className="flex-1" onClick={handleDone}>Done</Button>
          </div>

          {/* Print-only version */}
          <div className="hidden print:block">
            <ShiftPrintReceipt shift={closedShift} />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center">
              <Wallet className="h-7 w-7 text-orange-600" />
            </div>
          </div>
          <DialogTitle className="text-center">Close Shift</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Started at {formatTime(shift.start_time)} · Count your drawer and enter the actual cash.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 text-sm bg-muted/40 rounded-lg p-3 mt-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Starting Cash</span><span className="font-mono">{fmt(shift.start_balance)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cash Sales (estimated)</span><span className="font-mono text-green-600">+{fmt(shift.total_cash_sales || 0)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1.5"><span>Expected in Drawer</span><span className="font-mono">{fmt(estimatedExpected)}</span></div>
        </div>

        <form onSubmit={handleClose} className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label htmlFor="actualCash">Actual Cash in Drawer (₱)</Label>
            <Input
              id="actualCash"
              type="number"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
              required
              disabled={isLoading}
              className="text-lg font-mono"
            />
          </div>

          {actualCash !== "" && estimatedDiscrepancy !== null && (
            <div className={`flex justify-between rounded-lg px-3 py-2 text-sm font-semibold ${estimatedDiscrepancy === 0 ? "bg-green-50 text-green-700" : estimatedDiscrepancy > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
              <span>{estimatedDiscrepancy > 0 ? "Overage" : estimatedDiscrepancy < 0 ? "Shortage" : "Balanced ✓"}</span>
              <span className="font-mono">{estimatedDiscrepancy >= 0 ? "+" : "-"}{fmt(Math.abs(estimatedDiscrepancy))}</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Closing..." : "Close Shift"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ShiftPrintReceipt({ shift }: { shift: Shift }) {
  const disc = shift.discrepancy ?? 0
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("en-PH", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true })

  return (
    <div style={{ fontFamily: "monospace", fontSize: "12px", width: "80mm", margin: "0 auto", padding: "8px" }}>
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontWeight: "bold", fontSize: "14px" }}>CORON GRILL DINERS</div>
        <div style={{ fontSize: "10px" }}>Beside Panda House, 1 Don Pedro St</div>
        <div style={{ fontSize: "10px" }}>Barangay Poblacion, Coron</div>
        <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
        <div style={{ fontWeight: "bold", fontSize: "13px" }}>SHIFT SUMMARY</div>
      </div>

      <div style={{ marginBottom: "6px" }}>
        <div><strong>Cashier:</strong> {shift.cashier_name}</div>
        <div><strong>Start:</strong> {formatTime(shift.start_time)}</div>
        {shift.end_time && <div><strong>End:</strong> {formatTime(shift.end_time)}</div>}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      <table style={{ width: "100%", fontSize: "11px" }}>
        <tbody>
          <tr><td>Starting Cash</td><td style={{ textAlign: "right" }}>₱{shift.start_balance.toFixed(2)}</td></tr>
          <tr><td>Cash Sales</td><td style={{ textAlign: "right" }}>+₱{shift.total_cash_sales.toFixed(2)}</td></tr>
          <tr><td>Expected Cash</td><td style={{ textAlign: "right" }}>₱{(shift.expected_cash ?? 0).toFixed(2)}</td></tr>
          <tr><td>Actual Cash</td><td style={{ textAlign: "right" }}>₱{(shift.end_balance ?? 0).toFixed(2)}</td></tr>
          <tr><td style={{ borderTop: "1px dashed #000", paddingTop: "4px", fontWeight: "bold" }}>{disc >= 0 ? "OVERAGE" : "SHORTAGE"}</td>
            <td style={{ borderTop: "1px dashed #000", paddingTop: "4px", fontWeight: "bold", textAlign: "right" }}>{disc >= 0 ? "+" : "-"}₱{Math.abs(disc).toFixed(2)}</td>
          </tr>
          <tr><td colSpan={2} style={{ paddingTop: "4px" }}> </td></tr>
          <tr><td>Total Sales</td><td style={{ textAlign: "right" }}>₱{shift.total_sales.toFixed(2)}</td></tr>
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <div style={{ textAlign: "center", fontSize: "10px" }}>Thank you for your service!</div>
    </div>
  )
}
