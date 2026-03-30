"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { initialProducts } from "../data/products"
import type { Product } from "./cart-context"

interface Category {
  id: string
  name: string
}

interface ProductContextType {
  products: Product[]
  categories: Category[]
  isEditMode: boolean
  toggleEditMode: () => void
  addProduct: (product: Omit<Product, "id">) => void
  updateProduct: (id: number, product: Partial<Product>) => void
  deleteProduct: (id: number) => void
  addCategory: (category: Category) => void
  updateCategory: (id: string, name: string) => void
  deleteCategory: (id: string) => void
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

const defaultCategories: Category[] = [
  { id: "main-course", name: "Main Course" },
  { id: "appetizer", name: "Appetizer" },
  { id: "pasta-noodles", name: "Pasta & Noodles" },
  { id: "grill-diners-budget", name: "Grill Diners Budget" },
  { id: "all-day-breakfast-silog", name: "All Day Breakfast Silog" },
  { id: "combo-meals", name: "Combo Meal's (On Hot Plate)" },
  { id: "special-set", name: "Special Set" },
  { id: "snacks-burger-sub", name: "Snack's Burger & Sub" },
  { id: "american-breakfast", name: "American Breakfast" },
  { id: "continental-breakfast", name: "Continental Breakfast" },
  { id: "side-order", name: "Side Order" },
  { id: "sizzlers", name: "Sizzlers" },
  { id: "salads", name: "Salads" },
  { id: "desserts", name: "Desserts" },
  { id: "shakes", name: "Shakes" },
  { id: "beers", name: "Beers" },
  { id: "drinks", name: "Drinks" },
  { id: "beer-buckets", name: "Beer Buckets (w/ free Sizzling Bopis)" },
]

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [isEditMode, setIsEditMode] = useState(false)

  // Load products from localStorage on initial render
  useEffect(() => {
    const savedProducts = localStorage.getItem("pos-products")
    const savedCategories = localStorage.getItem("pos-categories")
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts))
      } catch (error) {
        console.error("Failed to parse products from localStorage:", error)
      }
    }
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories))
      } catch (error) {
        console.error("Failed to parse categories from localStorage:", error)
      }
    }
  }, [])

  // Save products to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("pos-products", JSON.stringify(products))
  }, [products])

  // Save categories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("pos-categories", JSON.stringify(categories))
  }, [categories])

  const toggleEditMode = () => {
    setIsEditMode((prev) => !prev)
  }

  const addProduct = (product: Omit<Product, "id">) => {
    const newId = Math.max(...products.map((p) => p.id), 0) + 1
    setProducts((prev) => [...prev, { ...product, id: newId }])
  }

  const updateProduct = (id: number, updatedFields: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? { ...product, ...updatedFields } : product))
    )
  }

  const deleteProduct = (id: number) => {
    setProducts((prev) => prev.filter((product) => product.id !== id))
  }

  const addCategory = (category: Category) => {
    setCategories((prev) => [...prev, category])
  }

  const updateCategory = (id: string, name: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat))
    )
  }

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id))
  }

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        isEditMode,
        toggleEditMode,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </ProductContext.Provider>
  )
}

export function useProducts() {
  const context = useContext(ProductContext)
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider")
  }
  return context
}
