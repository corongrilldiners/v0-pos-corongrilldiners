const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setup() {
  const client = await pool.connect();
  try {
    console.log("Creating/fixing tables...");

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Drop and recreate sales table with correct column names
    await client.query(`DROP TABLE IF EXISTS sales`);
    await client.query(`
      CREATE TABLE sales (
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        description TEXT,
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)
    `);

    // Create shifts table
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id ON shifts(cashier_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time DESC)
    `);

    console.log("Tables created/fixed. Seeding users...");

    const cashierHash = bcrypt.hashSync("cashier123", 10);
    const adminHash = bcrypt.hashSync("admin123", 10);

    const users = [
      { username: "cashier1", name: "Cashier 1", hash: cashierHash, role: "staff" },
      { username: "cashier2", name: "Cashier 2", hash: cashierHash, role: "staff" },
      { username: "cashier3", name: "Cashier 3", hash: cashierHash, role: "staff" },
      { username: "cashier4", name: "Cashier 4", hash: cashierHash, role: "staff" },
      { username: "admin",    name: "Admin",     hash: adminHash,    role: "admin" },
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
      console.log(`  Upserted user: ${u.username} (${u.role})`);
    }

    const result = await client.query("SELECT id, username, name, role FROM users ORDER BY id");
    console.log("\nUsers in database:");
    result.rows.forEach((r) => console.log(`  ${r.id}: ${r.username} / ${r.name} / ${r.role}`));

    // Verify tables
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log("\nTables:");
    tables.rows.forEach((r) => console.log(`  ${r.table_name}`));

    console.log("\nDatabase setup complete!");
  } catch (err) {
    console.error("Setup error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
