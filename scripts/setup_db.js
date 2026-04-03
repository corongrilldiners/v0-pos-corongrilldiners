const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setup() {
  const client = await pool.connect();
  try {
    console.log("=== Coron Grill Diners POS — Database Setup ===\n");

    // ── USERS ─────────────────────────────────────────────────────────────────
    console.log("Creating users table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // ── CATEGORIES ────────────────────────────────────────────────────────────
    console.log("Creating categories table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // ── PRODUCTS ──────────────────────────────────────────────────────────────
    console.log("Creating products table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price DECIMAL(10, 2) NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        description TEXT,
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);

    // ── SALES ─────────────────────────────────────────────────────────────────
    console.log("Creating sales table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number TEXT NOT NULL UNIQUE,
        items JSONB NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        service_charge DECIMAL(10, 2) DEFAULT 0,
        grand_total DECIMAL(10, 2) NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'gcash', 'card')),
        amount_tendered DECIMAL(10, 2) DEFAULT 0,
        change_amount DECIMAL(10, 2) DEFAULT 0,
        server_name TEXT,
        created_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method)`);

    // ── SHIFTS ────────────────────────────────────────────────────────────────
    console.log("Creating shifts table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        cashier_id INTEGER NOT NULL REFERENCES users(id),
        cashier_name TEXT NOT NULL,
        cashier_username TEXT NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        end_time TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        start_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
        end_balance DECIMAL(10, 2),
        total_cash_sales DECIMAL(10, 2) DEFAULT 0,
        total_sales DECIMAL(10, 2) DEFAULT 0,
        expected_cash DECIMAL(10, 2),
        discrepancy DECIMAL(10, 2)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id ON shifts(cashier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time DESC)`);

    console.log("All tables created.\n");

    // ── SEED USERS ────────────────────────────────────────────────────────────
    console.log("Seeding users...");
    const cashierHash = bcrypt.hashSync("cashier123", 10);
    const adminHash   = bcrypt.hashSync("admin123",   10);

    const users = [
      { username: "admin",    name: "Admin",     hash: adminHash,   role: "admin"  },
      { username: "cashier1", name: "Cashier 1", hash: cashierHash, role: "staff"  },
      { username: "cashier2", name: "Cashier 2", hash: cashierHash, role: "staff"  },
      { username: "cashier3", name: "Cashier 3", hash: cashierHash, role: "staff"  },
      { username: "cashier4", name: "Cashier 4", hash: cashierHash, role: "staff"  },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (username, name, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO UPDATE
           SET name = EXCLUDED.name,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role`,
        [u.username, u.name, u.hash, u.role]
      );
      console.log(`  ✓ ${u.username} (${u.role})`);
    }

    // ── SEED CATEGORIES ───────────────────────────────────────────────────────
    console.log("\nSeeding categories...");
    const categories = [
      { name: "Chicken",     order: 1 },
      { name: "Pork",        order: 2 },
      { name: "Seafood",     order: 3 },
      { name: "Vegetables",  order: 4 },
      { name: "Beverages",   order: 5 },
      { name: "Extra",       order: 6 },
      { name: "Silog Meals", order: 7 },
      { name: "Pulutan",     order: 8 },
    ];

    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (name, display_order)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order`,
        [c.name, c.order]
      );
      console.log(`  ✓ ${c.name}`);
    }

    // ── SEED PRODUCTS ─────────────────────────────────────────────────────────
    console.log("\nSeeding products...");
    const products = [
      // Chicken
      { name: "Fried Chicken (Paa)",    price: 65,  category: "Chicken"     },
      { name: "Fried Chicken (Pecho)",  price: 70,  category: "Chicken"     },
      { name: "Chicken Inasal (Paa)",   price: 75,  category: "Chicken"     },
      { name: "Chicken Inasal (Pecho)", price: 85,  category: "Chicken"     },
      { name: "Chicken BBQ",            price: 20,  category: "Chicken"     },
      // Pork
      { name: "Pork BBQ",               price: 15,  category: "Pork"        },
      { name: "Pork Sisig",             price: 85,  category: "Pork"        },
      { name: "Pork Liempo (1/4)",      price: 85,  category: "Pork"        },
      { name: "Pork Inihaw",            price: 95,  category: "Pork"        },
      { name: "Pork Sinigang",          price: 120, category: "Pork"        },
      { name: "Lechon Kawali",          price: 110, category: "Pork"        },
      { name: "Crispy Pata",            price: 350, category: "Pork"        },
      { name: "Tokwa't Baboy",          price: 75,  category: "Pork"        },
      // Seafood
      { name: "Sinigang na Hipon",      price: 180, category: "Seafood"     },
      { name: "Fish Fillet",            price: 120, category: "Seafood"     },
      { name: "Grilled Bangus",         price: 150, category: "Seafood"     },
      { name: "Calamares",              price: 130, category: "Seafood"     },
      { name: "Shrimp Gambas",          price: 180, category: "Seafood"     },
      // Vegetables
      { name: "Pinakbet",               price: 85,  category: "Vegetables"  },
      { name: "Chopsuey",               price: 95,  category: "Vegetables"  },
      { name: "Kangkong",               price: 60,  category: "Vegetables"  },
      { name: "Ensaladang Talong",      price: 55,  category: "Vegetables"  },
      // Beverages
      { name: "Coke",                   price: 35,  category: "Beverages"   },
      { name: "Coke Mismo",             price: 25,  category: "Beverages"   },
      { name: "Royal",                  price: 35,  category: "Beverages"   },
      { name: "Sprite",                 price: 35,  category: "Beverages"   },
      { name: "Bottled Water",          price: 20,  category: "Beverages"   },
      { name: "Iced Tea",               price: 30,  category: "Beverages"   },
      { name: "San Mig Light",          price: 55,  category: "Beverages"   },
      { name: "Red Horse",              price: 60,  category: "Beverages"   },
      { name: "San Miguel Pilsen",      price: 50,  category: "Beverages"   },
      // Extra
      { name: "Plain Rice",             price: 15,  category: "Extra"       },
      { name: "Garlic Rice",            price: 25,  category: "Extra"       },
      { name: "Java Rice",              price: 30,  category: "Extra"       },
      { name: "Extra Sauce",            price: 10,  category: "Extra"       },
      { name: "Atchara",                price: 20,  category: "Extra"       },
      // Silog Meals
      { name: "Tapsilog",               price: 85,  category: "Silog Meals" },
      { name: "Longsilog",              price: 75,  category: "Silog Meals" },
      { name: "Tocilog",                price: 75,  category: "Silog Meals" },
      { name: "Bangsilog",              price: 95,  category: "Silog Meals" },
      { name: "Chicksilog",             price: 85,  category: "Silog Meals" },
      { name: "Porksilog",              price: 85,  category: "Silog Meals" },
      // Pulutan
      { name: "Chicharon Bulaklak",     price: 95,  category: "Pulutan"     },
      { name: "Sisig",                  price: 95,  category: "Pulutan"     },
      { name: "Kilawin",                price: 110, category: "Pulutan"     },
      { name: "Dynamite Lumpia",        price: 65,  category: "Pulutan"     },
      { name: "Crispy Tenga",           price: 85,  category: "Pulutan"     },
    ];

    for (const p of products) {
      await client.query(
        `INSERT INTO products (name, price, category, available)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (name) DO UPDATE
           SET price = EXCLUDED.price,
               category = EXCLUDED.category`,
        [p.name, p.price, p.category]
      );
    }
    console.log(`  ✓ ${products.length} products seeded`);

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    const [u, c, p] = await Promise.all([
      client.query("SELECT COUNT(*) FROM users"),
      client.query("SELECT COUNT(*) FROM categories"),
      client.query("SELECT COUNT(*) FROM products"),
    ]);
    console.log(`\nDatabase ready:`);
    console.log(`  Users: ${u.rows[0].count}`);
    console.log(`  Categories: ${c.rows[0].count}`);
    console.log(`  Products: ${p.rows[0].count}`);
    console.log("\n=== Setup complete ===");

  } catch (err) {
    console.error("Setup error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
