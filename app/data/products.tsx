import type { Product } from "../context/cart-context"

export const products: Product[] = [
  // Main Course
  { id: 1, name: "Beef Bulalo", price: 390, image: "/placeholder.svg", category: "main-course" },
  { id: 2, name: "Beef Caldereta", price: 380, image: "/placeholder.svg", category: "main-course" },
  { id: 3, name: "Pork Pata Humba", price: 365, image: "/placeholder.svg", category: "main-course" },
  { id: 4, name: "Pork Adobo", price: 380, image: "/placeholder.svg", category: "main-course" },
  { id: 5, name: "Chicken Cordon Bleu", price: 365, image: "/placeholder.svg", category: "main-course" },
  { id: 6, name: "Crispy Chicken Curry", price: 325, image: "/placeholder.svg", category: "main-course" },
  { id: 7, name: "Shrimp Tempura", price: 325, image: "/placeholder.svg", category: "main-course" },
  { id: 8, name: "Chopsuey", price: 310, image: "/placeholder.svg", category: "main-course" },
  { id: 9, name: "Stir Fry Vegetable", price: 280, image: "/placeholder.svg", category: "main-course" },

  // Appetizer
  { id: 10, name: "Sausage & Fries", price: 265, image: "/placeholder.svg", category: "appetizer" },
  { id: 11, name: "Pork Spring Roll (Lumpia Shanghai)", price: 265, image: "/placeholder.svg", category: "appetizer" },
  { id: 12, name: "Chicharon Bulaklak", price: 220, image: "/placeholder.svg", category: "appetizer" },
  { id: 13, name: "Chicken Dumplings Potsticker", price: 225, image: "/placeholder.svg", category: "appetizer" },
  { id: 14, name: "Calamares Frito", price: 260, image: "/placeholder.svg", category: "appetizer" },
  { id: 15, name: "Fish & Fries", price: 245, image: "/placeholder.svg", category: "appetizer" },
  { id: 16, name: "French Fries", price: 180, image: "/placeholder.svg", category: "appetizer" },
  { id: 17, name: "Bopis", price: 220, image: "/placeholder.svg", category: "appetizer" },

  // Pasta & Noodles
  { id: 18, name: "Bihon Guisado", price: 250, image: "/placeholder.svg", category: "pasta-noodles" },
  { id: 19, name: "Pancit Bam-i", price: 260, image: "/placeholder.svg", category: "pasta-noodles" },
  { id: 20, name: "Lomi (Good for 2-3 person)", price: 280, image: "/placeholder.svg", category: "pasta-noodles" },
  { id: 21, name: "Seafood Marinara", price: 385, image: "/placeholder.svg", category: "pasta-noodles" },
  { id: 22, name: "Chicken Alfredo", price: 345, image: "/placeholder.svg", category: "pasta-noodles" },
  { id: 23, name: "Spaghetti Meatballs", price: 365, image: "/placeholder.svg", category: "pasta-noodles" },

  // Grill Diners Budget (Specials) - Includes Rice, Soup & Drinks
  { id: 24, name: "Chicken Diners Inasal", price: 149, image: "/placeholder.svg", category: "grill-diners-budget", description: "Includes Rice, Soup & Drinks" },
  { id: 25, name: "Spare Ribs Diners", price: 169, image: "/placeholder.svg", category: "grill-diners-budget", description: "Includes Rice, Soup & Drinks" },
  { id: 26, name: "Grilled Pork Liempo", price: 179, image: "/placeholder.svg", category: "grill-diners-budget", description: "Includes Rice, Soup & Drinks" },
  { id: 27, name: "Salisbury Steak", price: 189, image: "/placeholder.svg", category: "grill-diners-budget", description: "Includes Rice, Soup & Drinks" },
  { id: 28, name: "Classic Chicken Wings", price: 179, image: "/placeholder.svg", category: "grill-diners-budget", description: "Includes Rice, Soup & Drinks" },
  { id: 29, name: "Garlic Parmesan Wings", price: 199, image: "/placeholder.svg", category: "grill-diners-budget", description: "Includes Rice, Soup & Drinks" },
  { id: 30, name: "Buffalo Wings", price: 199, image: "/placeholder.svg", category: "grill-diners-budget", description: "Includes Rice, Soup & Drinks" },

  // All Day Breakfast Silog
  { id: 31, name: "Danggit Silog", price: 159, image: "/placeholder.svg", category: "all-day-breakfast-silog" },
  { id: 32, name: "Bangus Silog", price: 159, image: "/placeholder.svg", category: "all-day-breakfast-silog" },
  { id: 33, name: "Crispy Chicken Silog", price: 169, image: "/placeholder.svg", category: "all-day-breakfast-silog" },
  { id: 34, name: "Chicken Ham Silog", price: 159, image: "/placeholder.svg", category: "all-day-breakfast-silog" },
  { id: 35, name: "Hotdog Silog", price: 149, image: "/placeholder.svg", category: "all-day-breakfast-silog" },
  { id: 36, name: "Tocino Silog", price: 169, image: "/placeholder.svg", category: "all-day-breakfast-silog" },
  { id: 37, name: "Longganisa Silog", price: 169, image: "/placeholder.svg", category: "all-day-breakfast-silog" },
  { id: 38, name: "Sisig Silog", price: 179, image: "/placeholder.svg", category: "all-day-breakfast-silog" },
  { id: 39, name: "Tapa Silog", price: 179, image: "/placeholder.svg", category: "all-day-breakfast-silog" },

  // Combo Meals (On Hot Plate) - ₱230.00 each
  { id: 40, name: "Fried Chicken & Calamares", price: 230, image: "/placeholder.svg", category: "combo-meals", description: "2 kind meals, Java Rice, Sunny side up egg & Drinks" },
  { id: 41, name: "Fried Chicken & Lumpia", price: 230, image: "/placeholder.svg", category: "combo-meals", description: "2 kind meals, Java Rice, Sunny side up egg & Drinks" },
  { id: 42, name: "Fried Chicken & Sisig", price: 230, image: "/placeholder.svg", category: "combo-meals", description: "2 kind meals, Java Rice, Sunny side up egg & Drinks" },
  { id: 43, name: "Fried Chicken & Stir Fry Veggies", price: 230, image: "/placeholder.svg", category: "combo-meals", description: "2 kind meals, Java Rice, Sunny side up egg & Drinks" },
  { id: 44, name: "Pork Sisig & Lumpia", price: 230, image: "/placeholder.svg", category: "combo-meals", description: "2 kind meals, Java Rice, Sunny side up egg & Drinks" },
  { id: 45, name: "Pork Sisig & Calamares", price: 230, image: "/placeholder.svg", category: "combo-meals", description: "2 kind meals, Java Rice, Sunny side up egg & Drinks" },
  { id: 46, name: "Pork Sisig & Stir Fry Veggies", price: 230, image: "/placeholder.svg", category: "combo-meals", description: "2 kind meals, Java Rice, Sunny side up egg & Drinks" },

  // Special Set - ₱265.00 each
  { id: 47, name: "Set A: Salisbury & Fried Chicken", price: 265, image: "/placeholder.svg", category: "special-set" },
  { id: 48, name: "Set B: Salisbury & Pork Sisig", price: 265, image: "/placeholder.svg", category: "special-set" },
  { id: 49, name: "Set C: Salisbury & Spring Roll", price: 265, image: "/placeholder.svg", category: "special-set" },

  // Snacks, Burger & Sub
  { id: 50, name: "Classic Cheese Burger", price: 345, image: "/placeholder.svg", category: "snacks-burger-sub" },
  { id: 51, name: "Crispy Chicken Burger", price: 325, image: "/placeholder.svg", category: "snacks-burger-sub" },
  { id: 52, name: "Vegetable Burger", price: 325, image: "/placeholder.svg", category: "snacks-burger-sub" },
  { id: 53, name: "Chicken Sandwich", price: 285, image: "/placeholder.svg", category: "snacks-burger-sub" },
  { id: 54, name: "Tuna Melt Sandwich", price: 295, image: "/placeholder.svg", category: "snacks-burger-sub" },
  { id: 55, name: "Grilled Cheese Sandwich", price: 320, image: "/placeholder.svg", category: "snacks-burger-sub" },

  // American Breakfast
  { id: 56, name: "American Breakfast", price: 380, image: "/placeholder.svg", category: "american-breakfast", description: "Egg, Sausage or Bacon, Hashbrown, Pancake or Waffle, Butter & Syrup" },

  // Continental Breakfast
  { id: 57, name: "Continental Breakfast", price: 380, image: "/placeholder.svg", category: "continental-breakfast", description: "Egg, Toast Bread or Waffle, Baked Beans, Sausage, Butter, Syrup or Jam" },

  // Side Order
  { id: 58, name: "Seafood Fried Rice Platter", price: 230, image: "/placeholder.svg", category: "side-order" },
  { id: 59, name: "Java Rice", price: 45, image: "/placeholder.svg", category: "side-order" },
  { id: 60, name: "Java Rice Platter", price: 180, image: "/placeholder.svg", category: "side-order" },
  { id: 61, name: "Plain Rice", price: 25, image: "/placeholder.svg", category: "side-order" },
  { id: 62, name: "Plain Rice Platter", price: 110, image: "/placeholder.svg", category: "side-order" },
  { id: 63, name: "Garlic Rice", price: 35, image: "/placeholder.svg", category: "side-order" },
  { id: 64, name: "Add on Egg", price: 35, image: "/placeholder.svg", category: "side-order" },

  // Sizzlers
  { id: 65, name: "Sizzling Mixed Seafood", price: 385, image: "/placeholder.svg", category: "sizzlers" },
  { id: 66, name: "Sizzling Pork Sisig", price: 290, image: "/placeholder.svg", category: "sizzlers" },

  // Salads
  { id: 67, name: "Chicken Caesar Salad", price: 380, image: "/placeholder.svg", category: "salads" },
  { id: 68, name: "Grill Diners Salad", price: 380, image: "/placeholder.svg", category: "salads" },

  // Desserts
  { id: 69, name: "Churros", price: 180, image: "/placeholder.svg", category: "desserts" },
  { id: 70, name: "Leche Flan", price: 160, image: "/placeholder.svg", category: "desserts" },
  { id: 71, name: "Mais Con Yelo", price: 220, image: "/placeholder.svg", category: "desserts" },

  // Shakes
  { id: 72, name: "Mango Shake", price: 225, image: "/placeholder.svg", category: "shakes" },
  { id: 73, name: "Pineapple Shake", price: 225, image: "/placeholder.svg", category: "shakes" },
  { id: 74, name: "Watermelon Shake", price: 225, image: "/placeholder.svg", category: "shakes" },
  { id: 75, name: "Banana Shake", price: 200, image: "/placeholder.svg", category: "shakes" },
  { id: 76, name: "Cucumber & Pineapple Shake", price: 230, image: "/placeholder.svg", category: "shakes" },
  { id: 77, name: "Oreo Shake", price: 230, image: "/placeholder.svg", category: "shakes" },
  { id: 78, name: "Matcha Shake", price: 220, image: "/placeholder.svg", category: "shakes" },
  { id: 79, name: "Chocolate Shake", price: 200, image: "/placeholder.svg", category: "shakes" },
  { id: 80, name: "Strawberry Shake", price: 200, image: "/placeholder.svg", category: "shakes" },
  { id: 81, name: "Buko Juice", price: 100, image: "/placeholder.svg", category: "shakes" },

  // Beers
  { id: 82, name: "San Mig Light", price: 120, image: "/placeholder.svg", category: "beers" },
  { id: 83, name: "San Mig Pilsen", price: 120, image: "/placeholder.svg", category: "beers" },
  { id: 84, name: "San Mig Apple", price: 120, image: "/placeholder.svg", category: "beers" },
  { id: 85, name: "Red Horse Stallion", price: 120, image: "/placeholder.svg", category: "beers" },
  { id: 86, name: "Smirnoff Mule", price: 120, image: "/placeholder.svg", category: "beers" },
  { id: 87, name: "Red Horse Litro", price: 160, image: "/placeholder.svg", category: "beers" },

  // Drinks
  { id: 88, name: "Mineral Water (500ml)", price: 35, image: "/placeholder.svg", category: "drinks" },
  { id: 89, name: "Mineral Water (1 Liter)", price: 65, image: "/placeholder.svg", category: "drinks" },
  { id: 90, name: "Coke Zero", price: 65, image: "/placeholder.svg", category: "drinks" },
  { id: 91, name: "Sprite", price: 65, image: "/placeholder.svg", category: "drinks" },
  { id: 92, name: "Royal", price: 65, image: "/placeholder.svg", category: "drinks" },
  { id: 93, name: "Regular Coke", price: 65, image: "/placeholder.svg", category: "drinks" },
  { id: 94, name: "Chilled Mango Juice", price: 120, image: "/placeholder.svg", category: "drinks" },
  { id: 95, name: "Chilled Pineapple Juice", price: 120, image: "/placeholder.svg", category: "drinks" },

  // Beer Buckets (w/ free Sizzling Bopis)
  { id: 96, name: "San Mig Light Bucket", price: 700, image: "/placeholder.svg", category: "beer-buckets", description: "w/ free Sizzling Bopis" },
  { id: 97, name: "San Mig Pilsen Bucket", price: 700, image: "/placeholder.svg", category: "beer-buckets", description: "w/ free Sizzling Bopis" },
  { id: 98, name: "San Mig Apple Bucket", price: 700, image: "/placeholder.svg", category: "beer-buckets", description: "w/ free Sizzling Bopis" },
  { id: 99, name: "Red Horse Stallion Bucket", price: 700, image: "/placeholder.svg", category: "beer-buckets", description: "w/ free Sizzling Bopis" },
]
