"use client"

import { useState } from "react"
import { Wallet, LogIn, Loader2 } from "lucide-react"
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

interface ShiftStartModalProps {
  open: boolean
  cashierName: string
  onStart: (startBalance: number) => Promise<boolean>
}

export default function ShiftStartModal({ open, cashierName, onStart }: ShiftStartModalProps) {
  const [startBalance, setStartBalance] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const amount = parseFloat(startBalance)
    if (isNaN(amount) || amount < 0) {
      setError("Please enter a valid starting cash amount.")
      return
    }
    setIsLoading(true)
    const ok = await onStart(amount)
    setIsLoading(false)
    if (!ok) setError("Failed to start shift. Please try again.")
  }

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
              <Wallet className="h-7 w-7 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Start Your Shift</DialogTitle>
          <DialogDescription className="text-center">
            Welcome, <span className="font-semibold text-foreground">{cashierName}</span>!
            <br />
            <span className="text-xs">{today}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="startBalance" className="text-sm font-medium">
              Starting Cash Balance (₱)
            </Label>
            <Input
              id="startBalance"
              type="number"
              value={startBalance}
              onChange={(e) => setStartBalance(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
              required
              disabled={isLoading}
              className="text-lg font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Count and enter the cash currently in the drawer.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Starting shift..." : "Begin Shift"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
