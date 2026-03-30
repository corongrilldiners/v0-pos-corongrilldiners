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
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="thermal-receipt mx-auto bg-white p-4 font-mono text-xs"
        style={{ width: "80mm", maxWidth: "100%" }}
      >
        {/* Header with Logo */}
        <div className="text-center mb-3">
          <div className="flex justify-center mb-2">
            <Image
              src="/coron-grill-logo.png"
              alt="Coron Grill Diners"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <h1 className="text-base font-bold">CORON GRILL DINERS</h1>
          <p className="text-[10px] leading-tight mt-1">
            Beside Panda House, 1 Don Pedro St,
            <br />
            Barangay Poblacion, Coron,
            <br />
            5316 Palawan
          </p>
          <p className="text-[10px] mt-1">Contact: 0917-123-4567</p>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Order Metadata */}
        <div className="text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>Date/Time:</span>
            <span>{dateTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Order #:</span>
            <span>{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Server:</span>
            <span>{serverName}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Order Table Header */}
        <div className="flex text-[10px] font-bold border-b border-gray-300 pb-1">
          <span className="w-8 text-center">Qty</span>
          <span className="flex-1">Item</span>
          <span className="w-16 text-right">Price</span>
        </div>

        {/* Order Items */}
        <div className="space-y-1 py-1">
          {items.map((item) => (
            <div key={item.id} className="flex text-[10px]">
              <span className="w-8 text-center">{item.quantity}</span>
              <span className="flex-1 truncate pr-1">{item.name}</span>
              <span className="w-16 text-right">
                {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Financials */}
        <div className="text-[10px] space-y-0.5">
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
          <div className="flex justify-between font-bold text-xs border-t border-gray-300 pt-1 mt-1">
            <span>GRAND TOTAL:</span>
            <span>₱{grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-2">
            <span>Amount Tendered:</span>
            <span>₱{amountTendered.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Change:</span>
            <span>₱{change.toFixed(2)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-3" />

        {/* Footer */}
        <div className="text-center text-[10px]">
          <p className="font-semibold">Thank you for dining with us!</p>
          <p className="mt-1">Visit us again in Coron!</p>
          <p className="mt-2 text-[8px] text-gray-500">
            --- END OF RECEIPT ---
          </p>
        </div>
      </div>
    )
  }
)

ThermalReceipt.displayName = "ThermalReceipt"

export default ThermalReceipt
