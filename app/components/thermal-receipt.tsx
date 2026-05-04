"use client"

import { forwardRef } from "react"
import Image from "next/image"

interface ReceiptItem {
  id: number
  name: string
  price: number
  quantity: number
}

interface ThermalReceiptProps {
  items: ReceiptItem[]
  subtotal: number
  serviceCharge: number
  grandTotal: number
  amountTendered: number
  change: number
  orderNumber: string
  serverName: string
  dateTime: string
  includeServiceCharge: boolean
  paymentMethod?: string
}

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  (
    {
      items,
      subtotal,
      serviceCharge,
      grandTotal,
      amountTendered,
      change,
      orderNumber,
      serverName,
      dateTime,
      includeServiceCharge,
      paymentMethod = "cash",
    },
    ref
  ) => {
    const qrData = encodeURIComponent("GCash/Maya Payment – Coron Grill Diners")
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}&color=000000&bgcolor=ffffff&margin=4`

    return (
      <div
        ref={ref}
        className="thermal-receipt mx-auto bg-white p-3 font-mono text-[10px]"
        style={{ width: "58mm", maxWidth: "100%" }}
      >
        {/* Header with Logo */}
        <div className="text-center mb-2">
          <div className="flex justify-center mb-1">
            <Image
              src="/corongrilldiners-logo.jpeg"
              alt="Coron Grill Diners"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <h1 className="text-[11px] font-bold tracking-wide leading-tight">CORON GRILL DINERS</h1>
          <p className="text-[9px] leading-tight mt-0.5">
            Beside Panda House, 1 Don Pedro St,
            <br />
            Brgy. Poblacion, Coron, 5316 Palawan
          </p>
          <p className="text-[9px] mt-0.5">Tel: 0917-123-4567</p>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-500 my-1" />

        {/* Order Metadata */}
        <div className="text-[9px] space-y-0.5">
          <div className="flex justify-between">
            <span>Date:</span>
            <span className="text-right max-w-[70%] leading-tight">{dateTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Order #:</span>
            <span className="font-bold">{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Server:</span>
            <span>{serverName}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span className="uppercase">{paymentMethod}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-500 my-1" />

        {/* Order Table Header */}
        <div className="flex text-[9px] font-bold border-b border-gray-400 pb-0.5">
          <span className="w-6 text-center">Qty</span>
          <span className="flex-1 pl-1">Item</span>
          <span className="w-14 text-right">Price</span>
        </div>

        {/* Order Items */}
        <div className="space-y-0.5 py-0.5">
          {items.map((item) => (
            <div key={item.id} className="flex text-[9px]">
              <span className="w-6 text-center flex-shrink-0">{item.quantity}</span>
              <span className="flex-1 pl-1 pr-1 break-words leading-tight">{item.name}</span>
              <span className="w-14 text-right flex-shrink-0">
                ₱{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-500 my-1" />

        {/* Financials */}
        <div className="text-[9px] space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          {includeServiceCharge && (
            <div className="flex justify-between">
              <span>Service Charge (5%):</span>
              <span>₱{serviceCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[10px] border-t border-gray-400 pt-0.5 mt-0.5">
            <span>GRAND TOTAL:</span>
            <span>₱{grandTotal.toFixed(2)}</span>
          </div>
          {paymentMethod === "cash" && (
            <>
              <div className="flex justify-between mt-1">
                <span>Tendered:</span>
                <span>₱{amountTendered.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>₱{change.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-500 my-2" />

        {/* QR Code */}
        <div className="text-center mb-2">
          <p className="text-[9px] font-bold mb-1 tracking-wide">SCAN TO PAY — GCASH / MAYA</p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="GCash / Maya QR Code"
              width={100}
              height={100}
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <p className="text-[8px] mt-0.5 font-semibold">GCash &amp; Maya Accepted Here</p>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-500 my-1" />

        {/* Footer */}
        <div className="text-center text-[9px]">
          <p className="font-bold">Thank you for dining!</p>
          <p className="mt-0.5">Visit us again in Coron!</p>
          <p className="mt-1 text-[8px] text-gray-500">--- END OF RECEIPT ---</p>
        </div>
      </div>
    )
  }
)

ThermalReceipt.displayName = "ThermalReceipt"

export default ThermalReceipt
