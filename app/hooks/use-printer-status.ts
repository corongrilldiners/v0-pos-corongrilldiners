"use client"

import { useEffect, useState } from "react"
import {
  type PrinterRole,
  type PrinterStatus,
  getPrinterStatus,
  subscribePrinterStatus,
  restoreMetaStatus,
} from "@/lib/printer-connection"

let restored = false

export function usePrinterStatus(role: PrinterRole): PrinterStatus {
  const [st, setSt] = useState<PrinterStatus>(() => {
    if (typeof window !== "undefined" && !restored) {
      restoreMetaStatus("cashier")
      restoreMetaStatus("kitchen")
      restored = true
    }
    return getPrinterStatus(role)
  })

  useEffect(() => {
    return subscribePrinterStatus(() => setSt(getPrinterStatus(role)))
  }, [role])

  return st
}
