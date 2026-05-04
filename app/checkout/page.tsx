"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft, CreditCard, Wallet, Printer, FileText, Loader2,
  Bluetooth, Usb, ChefHat, Receipt, PrinterCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useCart } from "../context/cart-context"
import ThermalReceipt from "../components/thermal-receipt"
import KitchenTicket from "../components/kitchen-ticket"
import { savePendingSale } from "@/hooks/use-offline-sync"
import { usePrinterStatus } from "@/app/hooks/use-printer-status"
import { printTo } from "@/lib/printer-connection"
import { buildCustomerReceipt, buildKitchenTicket, type PrintData } from "@/lib/escpos"

function generateOrderNumber() {
  const random = Math.floor(1000 + Math.random() * 9000)
  return `#CGD-${random}`
}

function formatDateTime() {
  const now = new Date()
  return now.toLocaleString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

// ─── Printer status badge ──────────────────────────────────────────────────────
function PrinterBadge({ role }: { role: "cashier" | "kitchen" }) {
  const st = usePrinterStatus(role)
  if (!st.connected) return null
  return (
    <Badge className="bg-green-100 text-green-700 border-0 text-[10px] gap-1 px-1.5 py-0">
      {st.type === "usb" ? <Usb className="h-2.5 w-2.5" /> : <Bluetooth className="h-2.5 w-2.5" />}
      {st.name.length > 18 ? st.name.substring(0, 18) + "…" : st.name}
    </Badge>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { cart, cartTotal, clearCart } = useCart()
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false)
  const [serverName, setServerName] = useState("Staff")
  const [amountTendered, setAmountTendered] = useState("")
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [orderNumber] = useState(generateOrderNumber())
  const [dateTime] = useState(formatDateTime())
  const [isSaving, setIsSaving] = useState(false)
  const [printTarget, setPrintTarget] = useState<"receipt" | "kitchen" | null>(null)
  const [cartSnapshot] = useState<typeof cart>(() => [...cart])
  const [cartTotalSnapshot] = useState(() => cartTotal)
  const receiptRef = useRef<HTMLDivElement>(null)
  const kitchenRef = useRef<HTMLDivElement>(null)

  const cashierPrinter = usePrinterStatus("cashier")
  const kitchenPrinter = usePrinterStatus("kitchen")

  useEffect(() => {
    if (session?.user?.name) setServerName(session.user.name)
  }, [session])

  const serviceCharge = includeServiceCharge ? cartTotalSnapshot * 0.05 : 0
  const grandTotal = cartTotalSnapshot + serviceCharge
  const tenderedAmount = parseFloat(amountTendered) || 0
  const change = tenderedAmount >= grandTotal ? tenderedAmount - grandTotal : 0

  const handleCheckout = () => {
    if (paymentMethod === "cash" && tenderedAmount < grandTotal) {
      alert("Amount tendered is less than the total amount due.")
      return
    }
    setShowSummaryModal(true)
  }

  const printData: PrintData = {
    orderNumber,
    dateTime,
    serverName,
    paymentMethod,
    items: cartSnapshot.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
    subtotal: cartTotalSnapshot,
    serviceCharge,
    grandTotal,
    amountTendered: tenderedAmount,
    change,
    includeServiceCharge,
  }

  const recordSale = async () => {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          items: printData.items,
          subtotal: cartTotalSnapshot,
          serviceCharge,
          grandTotal,
          paymentMethod,
          amountTendered: tenderedAmount,
          changeAmount: change,
          serverName,
          createdBy: session?.user?.name ?? serverName,
        }),
      })
      if (!res.ok) throw new Error("Server error")
    } catch {
      savePendingSale({
        orderNumber,
        items: printData.items,
        subtotal: cartTotalSnapshot,
        serviceCharge,
        grandTotal,
        paymentMethod,
        amountTendered: tenderedAmount,
        changeAmount: change,
        serverName,
        createdBy: session?.user?.name ?? serverName,
      })
      console.warn("[CGD POS] Sale saved offline – will sync when online")
    }
  }

  const finishOrder = (delay = 400) => {
    setTimeout(() => {
      clearCart()
      router.push("/")
    }, delay)
  }

  // ── Print: customer receipt ──────────────────────────────────────────────────
  const printCustomerReceipt = async () => {
    const result = await printTo("cashier", buildCustomerReceipt(printData))
    if (result !== "none") return // Direct ESC/POS print succeeded

    // Fallback: browser print
    setPrintTarget("receipt")
    await new Promise(r => setTimeout(r, 100))
    window.print()
    setPrintTarget(null)
  }

  // ── Print: kitchen ticket ────────────────────────────────────────────────────
  const printKitchenTicket = async () => {
    const result = await printTo("kitchen", buildKitchenTicket(printData))
    if (result !== "none") return // Direct ESC/POS print succeeded

    // Fallback: open kitchen-ticket page in new window → auto-prints
    sessionStorage.setItem("cgd_kitchen_ticket", JSON.stringify({
      orderNumber: printData.orderNumber,
      dateTime: printData.dateTime,
      serverName: printData.serverName,
      items: printData.items,
    }))
    window.open("/kitchen-ticket", "_blank", "width=400,height=600")
  }

  // ── Main action: save + print both + redirect ────────────────────────────────
  const handleConfirmAndPrintBoth = async () => {
    setIsSaving(true)
    await recordSale()
    setIsSaving(false)
    setShowSummaryModal(false)

    await Promise.all([
      printCustomerReceipt(),
      printKitchenTicket(),
    ])
    finishOrder()
  }

  const handlePrintReceiptOnly = async () => {
    setIsSaving(true)
    await recordSale()
    setIsSaving(false)
    setShowSummaryModal(false)
    await printCustomerReceipt()
    finishOrder()
  }

  const handlePrintKitchenOnly = async () => {
    setIsSaving(true)
    await recordSale()
    setIsSaving(false)
    setShowSummaryModal(false)
    await printKitchenTicket()
    finishOrder()
  }

  const handleDigitalOnly = async () => {
    await recordSale()
    clearCart()
    router.push("/success")
  }

  if (cartSnapshot.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center print:hidden">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Add some items to your cart before checkout</p>
          <Button className="mt-4" onClick={() => router.push("/")}>Return to POS</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── Main checkout page ───────────────────────────────────────────────── */}
      <div className="container mx-auto max-w-4xl py-8 print:hidden">
        <Button variant="ghost" className="mb-6" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to POS
        </Button>

        <h1 className="mb-6 text-3xl font-bold">Checkout</h1>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Order summary */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>
            <div className="rounded-lg border p-4 bg-white">
              {cartSnapshot.map((item) => (
                <div key={item.id} className="mb-3 flex justify-between">
                  <div className="flex-1 pr-4">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">₱{item.price.toFixed(2)} x {item.quantity}</p>
                  </div>
                  <p className="font-medium flex-shrink-0">₱{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <p>Subtotal</p>
                  <p>₱{cartTotalSnapshot.toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="serviceCharge"
                    checked={includeServiceCharge}
                    onCheckedChange={(checked) => setIncludeServiceCharge(checked as boolean)}
                  />
                  <Label htmlFor="serviceCharge" className="text-sm">Add Service Charge (5%)</Label>
                </div>
                {includeServiceCharge && (
                  <div className="flex justify-between text-muted-foreground">
                    <p>Service Charge (5%)</p>
                    <p>₱{serviceCharge.toFixed(2)}</p>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <p>Grand Total</p>
                  <p>₱{grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment details */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Payment Details</h2>
            <div className="rounded-lg border p-4 bg-white space-y-4">
              <div>
                <Label htmlFor="serverName" className="text-sm font-medium">Server Name</Label>
                <Input
                  id="serverName"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="Enter server name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center cursor-pointer">
                      <Wallet className="mr-2 h-4 w-4" />Cash
                    </Label>
                  </div>
                  <div className="mt-2 flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4" />Credit/Debit Card
                    </Label>
                  </div>
                  <div className="mt-2 flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="gcash" id="gcash" />
                    <Label htmlFor="gcash" className="flex items-center cursor-pointer">
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      GCash / Maya
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentMethod === "cash" && (
                <div>
                  <Label htmlFor="amountTendered" className="text-sm font-medium">Amount Tendered</Label>
                  <Input
                    id="amountTendered"
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="Enter amount received"
                    className="mt-1"
                    min={0}
                  />
                  {tenderedAmount >= grandTotal && (
                    <p className="mt-2 text-sm font-medium text-green-600">
                      Change: ₱{change.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={paymentMethod === "cash" && tenderedAmount < grandTotal}
              >
                Complete Payment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Order confirmation + print modal ─────────────────────────────────── */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-lg print:hidden">
          <DialogHeader>
            <DialogTitle>Order Confirmation</DialogTitle>
            <DialogDescription>Review the order, then choose how to print.</DialogDescription>
          </DialogHeader>

          {/* Receipt preview */}
          <div className="max-h-[45vh] overflow-auto border rounded-lg">
            <ThermalReceipt
              items={cartSnapshot}
              subtotal={cartTotalSnapshot}
              serviceCharge={serviceCharge}
              grandTotal={grandTotal}
              amountTendered={tenderedAmount}
              change={change}
              orderNumber={orderNumber}
              serverName={serverName}
              dateTime={dateTime}
              includeServiceCharge={includeServiceCharge}
              paymentMethod={paymentMethod}
            />
          </div>

          {/* Printer status row */}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              <span>Cashier:</span>
              {cashierPrinter.connected
                ? <PrinterBadge role="cashier" />
                : <span className="text-gray-400">Browser fallback</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <ChefHat className="h-3.5 w-3.5" />
              <span>Kitchen:</span>
              {kitchenPrinter.connected
                ? <PrinterBadge role="kitchen" />
                : <span className="text-gray-400">New-window fallback</span>}
            </div>
          </div>

          {/* Print action buttons */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {/* Print Both — primary action */}
            <Button
              className="col-span-2 bg-primary gap-2"
              size="lg"
              onClick={handleConfirmAndPrintBoth}
              disabled={isSaving}
            >
              {isSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <PrinterCheck className="h-4 w-4" />}
              {isSaving ? "Saving…" : "Print Both (Receipt + Kitchen)"}
            </Button>

            {/* Receipt only */}
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePrintReceiptOnly}
              disabled={isSaving}
            >
              <Receipt className="h-4 w-4" />
              Customer Receipt
            </Button>

            {/* Kitchen only */}
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePrintKitchenOnly}
              disabled={isSaving}
            >
              <ChefHat className="h-4 w-4" />
              Kitchen Ticket
            </Button>

            {/* Digital only */}
            <Button
              variant="ghost"
              className="col-span-2 text-muted-foreground gap-2"
              onClick={handleDigitalOnly}
              disabled={isSaving}
            >
              <FileText className="h-4 w-4" />
              Digital Record Only (No Print)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Hidden print targets ──────────────────────────────────────────────── */}
      {/* Customer receipt — used when printTarget === "receipt" */}
      <div className={printTarget === "receipt" ? "print:block" : "hidden"}>
        <ThermalReceipt
          ref={receiptRef}
          items={cartSnapshot}
          subtotal={cartTotalSnapshot}
          serviceCharge={serviceCharge}
          grandTotal={grandTotal}
          amountTendered={tenderedAmount}
          change={change}
          orderNumber={orderNumber}
          serverName={serverName}
          dateTime={dateTime}
          includeServiceCharge={includeServiceCharge}
          paymentMethod={paymentMethod}
        />
      </div>

      {/* Kitchen ticket — used when printTarget === "kitchen" (single-window fallback) */}
      <div className={printTarget === "kitchen" ? "print:block" : "hidden"}>
        <KitchenTicket
          ref={kitchenRef}
          items={cartSnapshot}
          orderNumber={orderNumber}
          serverName={serverName}
          dateTime={dateTime}
        />
      </div>
    </>
  )
}
