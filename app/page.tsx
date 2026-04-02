"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import ProductGrid from "./components/product-grid"
import CartSidebar from "./components/cart-sidebar"
import CategorySidebar from "./components/category-sidebar"
import ShiftStartModal from "./components/shift-start-modal"
import ShiftCloseModal from "./components/shift-close-modal"
import { useShift } from "@/hooks/use-shift"

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const { data: session } = useSession()

  const {
    shift,
    loading,
    showStartModal,
    showCloseModal,
    setShowCloseModal,
    startShift,
    closeShift,
  } = useShift()

  return (
    <div className="flex h-screen bg-background">
      <CategorySidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        shift={shift}
        onCloseShift={() => setShowCloseModal(true)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="sticky top-0 z-10 bg-background p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Coron Grill Diners</h1>
              {shift && !loading && (
                <p className="text-xs text-muted-foreground">
                  Shift started ·{" "}
                  {new Date(shift.start_time).toLocaleTimeString("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                  {" "}· Starting cash: ₱{shift.start_balance.toFixed(2)}
                </p>
              )}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <ProductGrid category={selectedCategory} searchQuery={searchQuery} />
        </div>
      </main>

      <CartSidebar />

      {/* Shift modals */}
      {!loading && session?.user && (
        <>
          <ShiftStartModal
            open={showStartModal}
            cashierName={session.user.name ?? ""}
            onStart={startShift}
          />
          {shift && (
            <ShiftCloseModal
              open={showCloseModal}
              shift={shift}
              onClose={closeShift}
              onOpenChange={setShowCloseModal}
            />
          )}
        </>
      )}
    </div>
  )
}
