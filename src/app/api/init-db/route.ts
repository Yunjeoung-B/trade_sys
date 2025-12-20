import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    // Create tables using raw SQL
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        username VARCHAR NOT NULL UNIQUE,
        password VARCHAR NOT NULL,
        first_name VARCHAR,
        last_name VARCHAR,
        email VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'client',
        major_group VARCHAR,
        mid_group VARCHAR,
        sub_group VARCHAR,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS currency_pairs (
        id VARCHAR PRIMARY KEY,
        symbol VARCHAR NOT NULL UNIQUE,
        base_currency VARCHAR NOT NULL,
        quote_currency VARCHAR NOT NULL,
        is_active BOOLEAN DEFAULT true
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS market_rates (
        id VARCHAR PRIMARY KEY,
        currency_pair_id VARCHAR REFERENCES currency_pairs(id),
        buy_rate DECIMAL(12, 4) NOT NULL,
        sell_rate DECIMAL(12, 4) NOT NULL,
        source VARCHAR DEFAULT 'manual',
        timestamp TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS spread_settings (
        id VARCHAR PRIMARY KEY,
        product_type VARCHAR NOT NULL,
        currency_pair_id VARCHAR REFERENCES currency_pairs(id),
        group_type VARCHAR,
        group_value VARCHAR,
        base_spread DECIMAL(8, 4) NOT NULL,
        tenor_spreads JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_requests (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        product_type VARCHAR NOT NULL,
        currency_pair_id VARCHAR REFERENCES currency_pairs(id),
        direction VARCHAR NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        amount_currency VARCHAR,
        order_type VARCHAR,
        limit_rate DECIMAL(12, 4),
        validity_type VARCHAR,
        valid_until_time VARCHAR,
        tenor VARCHAR,
        near_date TIMESTAMP,
        far_date TIMESTAMP,
        near_rate DECIMAL(12, 4),
        near_amount DECIMAL(18, 2),
        near_amount_currency VARCHAR,
        far_amount DECIMAL(18, 2),
        far_amount_currency VARCHAR,
        hedge_completed BOOLEAN DEFAULT false,
        near_spread DECIMAL(8, 4),
        far_spread DECIMAL(8, 4),
        status VARCHAR DEFAULT 'REQUESTED',
        approved_by VARCHAR REFERENCES users(id),
        approved_at TIMESTAMP,
        quoted_rate DECIMAL(12, 4),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        trade_number VARCHAR NOT NULL UNIQUE,
        product_type VARCHAR NOT NULL,
        currency_pair_id VARCHAR REFERENCES currency_pairs(id),
        direction VARCHAR NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        amount_currency VARCHAR,
        order_type VARCHAR,
        limit_rate DECIMAL(12, 4),
        validity_type VARCHAR,
        valid_until_time VARCHAR,
        rate DECIMAL(12, 4) NOT NULL,
        settlement_date TIMESTAMP,
        maturity_date TIMESTAMP,
        status VARCHAR DEFAULT 'active',
        quote_request_id VARCHAR REFERENCES quote_requests(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS auto_approval_settings (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        max_amount DECIMAL(18, 2) NOT NULL,
        time_window_minutes INTEGER DEFAULT 30,
        is_enabled BOOLEAN DEFAULT false,
        allow_weekends BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS swap_points (
        id VARCHAR PRIMARY KEY,
        currency_pair_id VARCHAR REFERENCES currency_pairs(id),
        tenor VARCHAR,
        start_date TIMESTAMP,
        settlement_date TIMESTAMP,
        days INTEGER,
        swap_point DECIMAL(12, 6) NOT NULL,
        bid_price DECIMAL(12, 6),
        ask_price DECIMAL(12, 6),
        source VARCHAR DEFAULT 'excel',
        uploaded_by VARCHAR REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS swap_points_history (
        id VARCHAR PRIMARY KEY,
        currency_pair_id VARCHAR REFERENCES currency_pairs(id),
        tenor VARCHAR,
        settlement_date TIMESTAMP,
        previous_swap_point VARCHAR,
        new_swap_point VARCHAR NOT NULL,
        change_reason VARCHAR,
        changed_by VARCHAR REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS on_tn_rates (
        id VARCHAR PRIMARY KEY,
        currency_pair_id VARCHAR REFERENCES currency_pairs(id),
        tenor VARCHAR NOT NULL,
        start_date TIMESTAMP NOT NULL,
        settlement_date TIMESTAMP NOT NULL,
        swap_point DECIMAL(12, 6) NOT NULL,
        bid_price DECIMAL(12, 6),
        ask_price DECIMAL(12, 6),
        source VARCHAR DEFAULT 'manual',
        uploaded_by VARCHAR REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Check if admin user exists
    const existingUsers = await db.select().from(users).limit(1);

    if (existingUsers.length === 0) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.insert(users).values({
        id: nanoid(),
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        majorGroup: 'internal',
        midGroup: 'management',
        subGroup: 'admin',
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully. Admin user: admin / admin123',
    });
  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json(
      { error: 'Database initialization failed', details: String(error) },
      { status: 500 }
    );
  }
}
