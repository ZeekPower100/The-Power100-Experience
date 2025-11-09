const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!'
});

const keyMetrics = [
  { metric: "+12%", label: "Avg. Closing Rate Increase" },
  { metric: "-6.8%", label: "Avg. Cancel Rate Reduction" },
  { metric: "9.2/10", label: "Customer Experience Score" },
  { metric: "500+", label: "Verified Contractors Helped" }
];

const testimonials = [
  {
    quote: "DM transformed our culture. Turnover down 40%.",
    author: "John Smith",
    company: "ABC Contracting",
    revenue_tier: "$3-5M"
  },
  {
    quote: "The leadership training was a game-changer for our managers.",
    author: "Sarah Johnson",
    company: "Premier Builders",
    revenue_tier: "$1-3M"
  },
  {
    quote: "Employee satisfaction scores up 35% in just 6 months!",
    author: "Mike Davis",
    company: "Quality Construction",
    revenue_tier: "$5-10M"
  }
];

async function updatePartner() {
  try {
    const result = await pool.query(`
      UPDATE strategic_partners
      SET
        key_metrics = $1::jsonb,
        client_testimonials = $2::jsonb
      WHERE id = 1
      RETURNING id, company_name
    `, [JSON.stringify(keyMetrics), JSON.stringify(testimonials)]);

    console.log('✅ Successfully updated partner:', result.rows[0]);
    console.log('📊 Key metrics added:', keyMetrics.length);
    console.log('💬 Testimonials added:', testimonials.length);
  } catch (error) {
    console.error('❌ Error updating partner:', error.message);
  } finally {
    await pool.end();
  }
}

updatePartner();
