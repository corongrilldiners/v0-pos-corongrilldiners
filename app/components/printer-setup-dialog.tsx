"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Usb, Bluetooth, Wifi, WifiOff, Printer, CheckCircle, AlertCircle, Loader2, X,
} from "lucide-react"
import {
  type PrinterRole,
  connectUSB,
  connectBluetooth,
  disconnectPrinter,
  printTo,
} from "@/lib/printer-connection"
import { usePrinterStatus } from "@/app/hooks/use-printer-status"
import { buildCustomerReceipt, buildKitchenTicket, type PrintData } from "@/lib/escpos"

const TEST_DATA: PrintData = {
  orderNumber: "#CGD-TEST",
  dateTime: new Date().toLocaleString("en-PH"),
  serverName: "Test",
  paymentMethod: "cash",
  items: [
    { id: 1, name: "Test Item A", price: 100, quantity: 2 },
    { id: 2, name: "Test Item B", price: 75, quantity: 1 },
  ],
  subtotal: 275,
  serviceCharge: 0,
  grandTotal: 275,
  amountTendered: 300,
  change: 25,
  includeServiceCharge: false,
}

interface PrinterSlotProps {
  role: PrinterRole
  label: string
  description: string
}

function PrinterSlot({ role, label, description }: PrinterSlotProps) {
  const st = usePrinterStatus(role)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [testOk, setTestOk] = useState(false)

  const run = async (fn: () => Promise<void>, action: string) => {
    setBusy(action)
    setError("")
    setTestOk(false)
    try {
      await fn()
    } catch (e: any) {
      setError(e?.message ?? "Failed")
    } finally {
      setBusy(null)
    }
  }

  const testPrint = async () => {
    const data = role === "cashier"
      ? buildCustomerReceipt(TEST_DATA)
      : buildKitchenTicket(TEST_DATA)
    const result = await printTo(role, data)
    if (result === "none") setError("No printer connected. Connect USB or Bluetooth first.")
    else setTestOk(true)
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{label}</span>
            {st.connected ? (
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">Connected</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Not connected</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {st.connected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-red-600 flex-shrink-0"
            onClick={() => run(() => disconnectPrinter(role), "disconnect")}
            disabled={!!busy}
            title="Disconnect"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Connected device name */}
      {st.name && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 rounded-lg px-3 py-2">
          {st.type === "usb" ? <Usb className="h-3.5 w-3.5 flex-shrink-0" /> : <Bluetooth className="h-3.5 w-3.5 flex-shrink-0" />}
          <span className="truncate">{st.name}</span>
          {st.connected ? (
            <Wifi className="h-3.5 w-3.5 text-green-500 flex-shrink-0 ml-auto" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 ml-auto" />
          )}
        </div>
      )}

      {/* Error / success */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {testOk && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Test print sent successfully.
        </div>
      )}

      {/* Connect buttons */}
      {!st.connected && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => run(() => connectUSB(role), "usb")}
            disabled={!!busy}
          >
            {busy === "usb" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Usb className="h-3.5 w-3.5" />}
            USB
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => run(() => connectBluetooth(role), "bt")}
            disabled={!!busy}
          >
            {busy === "bt" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bluetooth className="h-3.5 w-3.5" />}
            Bluetooth
          </Button>
        </div>
      )}

      {/* Test print */}
      {st.connected && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => run(testPrint, "test")}
          disabled={!!busy}
        >
          {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
          Print Test Page
        </Button>
      )}
    </div>
  )
}

interface PrinterSetupDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function PrinterSetupDialog({ open, onOpenChange }: PrinterSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Printer Setup — XP-58H (58mm)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <PrinterSlot
            role="cashier"
            label="Cashier Printer"
            description="Prints customer receipts at the counter"
          />
          <PrinterSlot
            role="kitchen"
            label="Kitchen Printer"
            description="Prints order tickets in the kitchen"
          />
        </div>

        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Setup tips for XP-58H:</p>
          <p>• <strong>USB:</strong> Connect cable, click "USB", then select the XP-58H port from the browser dialog.</p>
          <p>• <strong>Bluetooth:</strong> Power on printer, enable BT pairing mode, click "Bluetooth", then select the device (usually named "XP-58" or "Printer").</p>
          <p>• Use <strong>Chrome</strong> on Android or desktop for best compatibility.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
