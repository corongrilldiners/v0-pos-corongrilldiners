"use client"

import type React from "react"

import {
  LayoutGrid,
  Utensils,
  Soup,
  ChefHat,
  Flame,
  Egg,
  UtensilsCrossed,
  Package,
  Sandwich,
  Coffee,
  Croissant,
  SaladIcon,
  CookingPot,
  LeafyGreen,
  IceCream,
  CupSoda,
  Beer,
  GlassWater,
  PartyPopper,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CategorySidebarProps {
  selectedCategory: string
  onSelectCategory: (category: string) => void
}

interface CategoryItem {
  id: string
  name: string
  icon: React.ElementType
}

const categories: CategoryItem[] = [
  {
    id: "all",
    name: "All Products",
    icon: LayoutGrid,
  },
  {
    id: "main-course",
    name: "Main Course",
    icon: Utensils,
  },
  {
    id: "appetizer",
    name: "Appetizer",
    icon: Soup,
  },
  {
    id: "pasta-noodles",
    name: "Pasta & Noodles",
    icon: ChefHat,
  },
  {
    id: "grill-diners-budget",
    name: "Grill Diners Budget",
    icon: Flame,
  },
  {
    id: "all-day-breakfast-silog",
    name: "All Day Breakfast Silog",
    icon: Egg,
  },
  {
    id: "combo-meals",
    name: "Combo Meal's (On Hot Plate)",
    icon: UtensilsCrossed,
  },
  {
    id: "special-set",
    name: "Special Set",
    icon: Package,
  },
  {
    id: "snacks-burger-sub",
    name: "Snack's Burger & Sub",
    icon: Sandwich,
  },
  {
    id: "american-breakfast",
    name: "American Breakfast",
    icon: Coffee,
  },
  {
    id: "continental-breakfast",
    name: "Continental Breakfast",
    icon: Croissant,
  },
  {
    id: "side-order",
    name: "Side Order",
    icon: SaladIcon,
  },
  {
    id: "sizzlers",
    name: "Sizzlers",
    icon: CookingPot,
  },
  {
    id: "salads",
    name: "Salads",
    icon: LeafyGreen,
  },
  {
    id: "desserts",
    name: "Desserts",
    icon: IceCream,
  },
  {
    id: "shakes",
    name: "Shakes",
    icon: CupSoda,
  },
  {
    id: "beers",
    name: "Beers",
    icon: Beer,
  },
  {
    id: "drinks",
    name: "Drinks",
    icon: GlassWater,
  },
  {
    id: "beer-buckets",
    name: "Beer Buckets (w/ free Sizzling Bopis)",
    icon: PartyPopper,
  },
]

export default function CategorySidebar({ selectedCategory, onSelectCategory }: CategorySidebarProps) {
  return (
    <div className="w-56 border-r bg-background flex flex-col h-full">
      <div className="p-4 pb-2 border-b">
        <h2 className="text-lg font-semibold">Categories</h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3">
        <div className="grid gap-2">
          {categories.map((category, index) => {
            const Icon = category.icon
            const isAllProducts = category.id === "all"
            const isActive = selectedCategory === category.id
            
            return (
              <Button
                key={category.id}
                variant="ghost"
                className={cn(
                  "flex h-auto flex-col items-center justify-center py-2 px-2 border bg-transparent min-h-[60px]",
                  isAllProducts && "font-semibold",
                  isActive
                    ? "border-2 border-primary bg-primary/10 text-primary font-medium"
                    : "border-muted text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                  "hover:bg-primary/5 transition-colors",
                )}
                onClick={() => onSelectCategory(category.id)}
              >
                <Icon className={cn("mb-1 h-5 w-5", isAllProducts && "h-6 w-6")} />
                <span className={cn(
                  "text-xs text-center leading-tight",
                  isAllProducts && "text-sm font-semibold",
                  category.id === "beer-buckets" && "text-[10px]"
                )}>
                  {category.name}
                </span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
