/**
 * Singleton printer connection manager for XP-58H printers.
 * Supports Web Serial (USB) and Web Bluetooth (BLE) connections.
 * Two roles: 'cashier' (customer receipt) and 'kitchen' (kitchen ticket).
 */

export type PrinterRole = 'cashier' | 'kitchen'
export type ConnType = 'usb' | 'bluetooth' | null

export interface PrinterStatus {
  connected: boolean
  name: string
  type: ConnType
}

// ─── BLE GATT UUIDs for XP-58H ────────────────────────────────────────────────
// The XP-58H BT model advertises the 18F0 service
const BLE_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
]
const BLE_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
]
const BLE_CHUNK = 200   // bytes per BLE write
const BLE_DELAY = 30    // ms between chunks
const USB_BAUD  = 9600  // XP-58H default serial baud rate

// ─── Module-level state ────────────────────────────────────────────────────────
// Using module-level variables so connections survive React re-renders

const usbPorts:  Partial<Record<PrinterRole, any>> = {}   // SerialPort
const btChars:   Partial<Record<PrinterRole, any>> = {}   // BluetoothRemoteGATTCharacteristic
const listeners: Set<() => void> = new Set()

const status: Record<PrinterRole, PrinterStatus> = {
  cashier: { connected: false, name: '', type: null },
  kitchen: { connected: false, name: '', type: null },
}

function notify() {
  listeners.forEach(fn => fn())
}

// ─── Listener registration ─────────────────────────────────────────────────────

export function subscribePrinterStatus(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getPrinterStatus(role: PrinterRole): PrinterStatus {
  return { ...status[role] }
}

// ─── USB (Web Serial) ──────────────────────────────────────────────────────────

export async function connectUSB(role: PrinterRole): Promise<void> {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API not supported. Use Chrome 89+ on a device with USB.')
  }
  const nav = navigator as any
  const port = await nav.serial.requestPort()
  await port.open({ baudRate: USB_BAUD })

  // Close any existing connection for this role
  await disconnectPrinter(role)

  usbPorts[role] = port
  const info = port.getInfo?.() ?? {}
  const name = info.usbVendorId
    ? `USB Printer (VID:${info.usbVendorId.toString(16).toUpperCase()})`
    : 'USB Printer'

  status[role] = { connected: true, name, type: 'usb' }
  saveMeta(role, 'usb', name)
  notify()
}

/** Re-request previously authorized USB port (auto-reconnect). */
export async function autoReconnectUSB(role: PrinterRole): Promise<boolean> {
  if (!('serial' in navigator)) return false
  try {
    const nav = navigator as any
    const ports: any[] = await nav.serial.getPorts()
    const meta = loadMeta(role)
    if (!meta || meta.type !== 'usb' || ports.length === 0) return false

    // Use the first authorized port for this role
    // In a multi-printer setup the order may vary; user should reconnect if wrong
    const port = ports[0]
    await port.open({ baudRate: USB_BAUD })
    usbPorts[role] = port
    status[role] = { connected: true, name: meta.name, type: 'usb' }
    notify()
    return true
  } catch {
    return false
  }
}

// ─── Bluetooth (Web BLE) ───────────────────────────────────────────────────────

export async function connectBluetooth(role: PrinterRole): Promise<void> {
  if (!('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth API not supported. Use Chrome on Android or a supported desktop.')
  }
  const nav = navigator as any

  // Disconnect existing first
  await disconnectPrinter(role)

  // Request device — try each known service UUID as a filter
  let device: any = null
  for (const svc of BLE_SERVICE_UUIDS) {
    try {
      device = await nav.bluetooth.requestDevice({
        filters: [{ services: [svc] }],
        optionalServices: BLE_SERVICE_UUIDS,
      })
      break
    } catch {
      // try next
    }
  }
  // Fallback: accept all devices with optional service discovery
  if (!device) {
    device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_SERVICE_UUIDS,
    })
  }

  const server = await device.gatt.connect()

  // Find the writable characteristic
  let characteristic: any = null
  for (const svcUUID of BLE_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(svcUUID)
      for (const charUUID of BLE_CHAR_UUIDS) {
        try {
          characteristic = await service.getCharacteristic(charUUID)
          if (characteristic) break
        } catch { /* try next */ }
      }
      if (characteristic) break
    } catch { /* try next service */ }
  }

  if (!characteristic) {
    device.gatt.disconnect()
    throw new Error(
      'Could not find printer write characteristic.\n' +
      'Make sure the XP-58H is powered on and in Bluetooth mode.'
    )
  }

  btChars[role] = characteristic
  const name = device.name ?? 'Bluetooth Printer'
  status[role] = { connected: true, name, type: 'bluetooth' }
  saveMeta(role, 'bluetooth', name)
  notify()

  // Auto-update status if device disconnects
  device.addEventListener('gattserverdisconnected', () => {
    delete btChars[role]
    status[role] = { connected: false, name: '', type: null }
    notify()
  })
}

// ─── Disconnect ────────────────────────────────────────────────────────────────

export async function disconnectPrinter(role: PrinterRole): Promise<void> {
  const port = usbPorts[role]
  if (port) {
    try {
      if (port.readable || port.writable) await port.close()
    } catch { /* ignore */ }
    delete usbPorts[role]
  }
  const char = btChars[role]
  if (char) {
    try { char.service.device.gatt?.disconnect() } catch { /* ignore */ }
    delete btChars[role]
  }
  status[role] = { connected: false, name: '', type: null }
  clearMeta(role)
  notify()
}

// ─── Print ─────────────────────────────────────────────────────────────────────

/** Send raw ESC/POS bytes to printer. Returns the method used. */
export async function printTo(role: PrinterRole, data: Uint8Array): Promise<'usb' | 'bluetooth' | 'none'> {
  const port = usbPorts[role]
  if (port) {
    const writer = port.writable?.getWriter()
    if (!writer) throw new Error('USB port not writable')
    try {
      await writer.write(data)
    } finally {
      writer.releaseLock()
    }
    return 'usb'
  }

  const char = btChars[role]
  if (char) {
    for (let i = 0; i < data.length; i += BLE_CHUNK) {
      await char.writeValue(data.slice(i, i + BLE_CHUNK))
      if (i + BLE_CHUNK < data.length) {
        await new Promise(r => setTimeout(r, BLE_DELAY))
      }
    }
    return 'bluetooth'
  }

  return 'none'
}

// ─── localStorage metadata ─────────────────────────────────────────────────────
// We persist the printer type + name so the setup dialog shows the last known printer.

interface PrinterMeta { type: ConnType; name: string }

function metaKey(role: PrinterRole) { return `cgd_printer_${role}` }

function saveMeta(role: PrinterRole, type: ConnType, name: string) {
  try { localStorage.setItem(metaKey(role), JSON.stringify({ type, name })) } catch { /* SSR */ }
}

function loadMeta(role: PrinterRole): PrinterMeta | null {
  try {
    const raw = localStorage.getItem(metaKey(role))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function clearMeta(role: PrinterRole) {
  try { localStorage.removeItem(metaKey(role)) } catch { /* SSR */ }
}

/** Restore last-known printer name from localStorage on page load (for display only). */
export function restoreMetaStatus(role: PrinterRole) {
  const meta = loadMeta(role)
  if (meta && meta.type) {
    // Mark as "known but not yet reconnected"
    status[role] = { connected: false, name: meta.name, type: meta.type }
  }
}
