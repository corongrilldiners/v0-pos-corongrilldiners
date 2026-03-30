"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, Wallet, Printer, FileText } from "lucide-react"

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
import { useCart } from "../context/cart-context"
import ThermalReceipt from "../components/thermal-receipt"

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CGD-${timestamp}-${random}`
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

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, cartTotal, clearCart } = useCart()
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false)
  const [serverName, setServerName] = useState("Staff")
  const [amountTendered, setAmountTendered] = useState("")
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [orderNumber] = useState(generateOrderNumber())
  const [dateTime] = useState(formatDateTime())
  const receiptRef = useRef<HTMLDivElement>(null)

  const serviceCharge = includeServiceCharge ? cartTotal * 0.05 : 0
  const grandTotal = cartTotal + serviceCharge

  const tenderedAmount = parseFloat(amountTendered) || 0
  const change = tenderedAmount >= grandTotal ? tenderedAmount - grandTotal : 0

  const handleCheckout = () => {
    if (tenderedAmount < grandTotal) {
      alert("Amount tendered is less than the total amount due.")
      return
    }
    setShowSummaryModal(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleConfirmAndPrint = () => {
    handlePrint()
    setTimeout(() => {
      clearCart()
      router.push("/success")
    }, 500)
  }

  const handleDigitalOnly = () => {
    clearCart()
    router.push("/success")
  }

  if (cart.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center print:hidden">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">
            Add some items to your cart before checkout
          </p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Return to POS
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Main Checkout UI - Hidden when printing */}
      <div className="container mx-auto max-w-4xl py-8 print:hidden">
        <Button variant="ghost" className="mb-6" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to POS
        </Button>

        <h1 className="mb-6 text-3xl font-bold">Checkout</h1>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>
            <div className="rounded-lg border p-4 bg-white">
              {cart.map((item) => (
                <div key={item.id} className="mb-3 flex justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₱{item.price.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <p>Subtotal</p>
                  <p>₱{cartTotal.toFixed(2)}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="serviceCharge"
                    checked={includeServiceCharge}
                    onCheckedChange={(checked) =>
                      setIncludeServiceCharge(checked as boolean)
                    }
                  />
                  <Label htmlFor="serviceCharge" className="text-sm">
                    Add Service Charge (5%)
                  </Label>
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

          <div>
            <h2 className="mb-4 text-xl font-semibold">Payment Details</h2>
            <div className="rounded-lg border p-4 bg-white space-y-4">
              <div>
                <Label htmlFor="serverName" className="text-sm font-medium">
                  Server Name
                </Label>
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
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center cursor-pointer">
                      <Wallet className="mr-2 h-4 w-4" />
                      Cash
                    </Label>
                  </div>

                  <div className="mt-2 flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Credit/Debit Card
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentMethod === "cash" && (
                <div>
                  <Label htmlFor="amountTendered" className="text-sm font-medium">
                    Amount Tendered
                  </Label>
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

      {/* Summary Modal */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-md print:hidden">
          <DialogHeader>
            <DialogTitle>Order Confirmation</DialogTitle>
            <DialogDescription>
              Review the order details before finalizing.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto">
            <ThermalReceipt
              items={cart}
              subtotal={cartTotal}
              serviceCharge={serviceCharge}
              grandTotal={grandTotal}
              amountTendered={tenderedAmount}
              change={change}
              orderNumber={orderNumber}
              serverName={serverName}
              dateTime={dateTime}
              includeServiceCharge={includeServiceCharge}
            />
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDigitalOnly}
            >
              <FileText className="mr-2 h-4 w-4" />
              Digital Record Only
            </Button>
            <Button className="flex-1" onClick={handleConfirmAndPrint}>
              <Printer className="mr-2 h-4 w-4" />
              Confirm & Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt - Only visible when printing */}
      <div className="hidden print:block">
        <ThermalReceipt
          ref={receiptRef}
          items={cart}
          subtotal={cartTotal}
          serviceCharge={serviceCharge}
          grandTotal={grandTotal}
          amountTendered={tenderedAmount}
          change={change}
          orderNumber={orderNumber}
          serverName={serverName}
          dateTime={dateTime}
          includeServiceCharge={includeServiceCharge}
        />
      </div>
    </>
  )
}
