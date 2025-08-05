// Script to seed test contractors with proper JSON data for testing Advanced Search
const { connectDB, query } = require('./src/config/database.sqlite');

const testContractors = [
  {
    name: "Mike Johnson",
    email: "mike.johnson@testmail.com", 
    phone: "555-0101",
    company_name: "Johnson Roofing Co",
    company_website: "johnsonroofing.com",
    service_area: "Austin, TX",
    services_offered: JSON.stringify(["Roofing", "Gutters", "Siding"]),
    focus_areas: JSON.stringify(["Revenue Growth", "Lead Generation", "Digital Marketing"]),
    primary_focus_area: "revenue_growth",
    annual_revenue: "500k_1m",
    team_size: 8,
    increased_tools: 1,
    increased_people: 1,
    increased_activity: 0,
    opted_in_coaching: 1,
    verification_status: "verified",
    current_stage: "completed"
  },
  {
    name: "Sarah Williams",
    email: "sarah@testmail.com",
    phone: "555-0102", 
    company_name: "Williams HVAC Services",
    company_website: "williamshvac.com",
    service_area: "Phoenix, AZ",
    services_offered: JSON.stringify(["HVAC Installation", "HVAC Repair", "Maintenance"]),
    focus_areas: JSON.stringify(["Operations", "Team Building", "Customer Service"]),
    primary_focus_area: "team_building", 
    annual_revenue: "1m_5m",
    team_size: 15,
    increased_tools: 0,
    increased_people: 1,
    increased_activity: 1,
    opted_in_coaching: 1,
    verification_status: "verified",
    current_stage: "completed"
  },
  {
    name: "David Chen",
    email: "david.chen@testmail.com",
    phone: "555-0103",
    company_name: "Chen Construction LLC", 
    company_website: "chenconstruction.com",
    service_area: "Denver, CO",
    services_offered: JSON.stringify(["General Contracting", "Remodeling", "New Construction"]),
    focus_areas: JSON.stringify(["Revenue Growth", "Strategic Planning", "Market Expansion"]),
    primary_focus_area: "strategic_planning",
    annual_revenue: "5m_10m", 
    team_size: 25,
    increased_tools: 1,
    increased_people: 0,
    increased_activity: 1,
    opted_in_coaching: 1,
    verification_status: "verified",
    current_stage: "completed"
  },
  {
    name: "Lisa Rodriguez",
    email: "lisa@testmail.com", 
    phone: "555-0104",
    company_name: "Rodriguez Plumbing",
    company_website: "rodriguezplumbing.com",
    service_area: "Miami, FL",
    services_offered: JSON.stringify(["Plumbing Repair", "Pipe Installation", "Emergency Services"]),
    focus_areas: JSON.stringify(["Lead Generation", "Digital Marketing", "Customer Service"]),
    primary_focus_area: "lead_generation",
    annual_revenue: "100k_500k",
    team_size: 5,
    increased_tools: 1,
    increased_people: 0,
    increased_activity: 0,
    opted_in_coaching: 1,
    verification_status: "verified", 
    current_stage: "matching"
  },
  {
    name: "Tom Anderson",
    email: "tom@testmail.com",
    phone: "555-0105",
    company_name: "Anderson Electrical",
    company_website: "andersonelectric.com", 
    service_area: "Seattle, WA",
    services_offered: JSON.stringify(["Electrical Installation", "Wiring", "Panel Upgrades"]),
    focus_areas: JSON.stringify(["Technology", "Operations", "Financial Management"]),
    primary_focus_area: "technology",
    annual_revenue: "1m_5m",
    team_size: 12,
    increased_tools: 0,
    increased_people: 1,
    increased_activity: 1,
    opted_in_coaching: 1,
    verification_status: "verified",
    current_stage: "profiling"
  },
  {
    name: "Jennifer Park",
    email: "jennifer@testmail.com",
    phone: "555-0106", 
    company_name: "Park Landscaping",
    company_website: "parklandscaping.com",
    service_area: "Portland, OR",
    services_offered: JSON.stringify(["Landscaping", "Lawn Care", "Tree Services"]),
    focus_areas: JSON.stringify(["Revenue Growth", "Team Building", "Brand Development"]),
    primary_focus_area: "brand_development",
    annual_revenue: "500k_1m", 
    team_size: 10,
    increased_tools: 1,
    increased_people: 1,
    increased_activity: 1,
    opted_in_coaching: 1,
    verification_status: "verified",
    current_stage: "focus_selection"
  },
  {
    name: "Robert Taylor",
    email: "robert@testmail.com",
    phone: "555-0107",
    company_name: "Taylor Painting Co",
    company_website: "taylorpainting.com",
    service_area: "Nashville, TN", 
    services_offered: JSON.stringify(["Interior Painting", "Exterior Painting", "Commercial Painting"]),
    focus_areas: JSON.stringify(["Sales Process", "Lead Generation", "Market Expansion"]),
    primary_focus_area: "sales_process",
    annual_revenue: "under_100k",
    team_size: 3,
    increased_tools: 0,
    increased_people: 0,
    increased_activity: 1,
    opted_in_coaching: 1,
    verification_status: "verified",
    current_stage: "verification"
  }
];

async function seedTestContractors() {
  try {
    await connectDB();
    console.log('🌱 Starting test contractor seeding...');

    for (const contractor of testContractors) {
      console.log(`Adding contractor: ${contractor.name} (${contractor.company_name})`);
      
      await query(`
        INSERT INTO contractors (
          name, email, phone, company_name, company_website, service_area,
          services_offered, focus_areas, primary_focus_area, annual_revenue,
          team_size, increased_tools, increased_people, increased_activity,
          opted_in_coaching, verification_status, current_stage,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        contractor.name,
        contractor.email, 
        contractor.phone,
        contractor.company_name,
        contractor.company_website,
        contractor.service_area,
        contractor.services_offered,
        contractor.focus_areas,
        contractor.primary_focus_area,
        contractor.annual_revenue,
        contractor.team_size,
        contractor.increased_tools,
        contractor.increased_people,
        contractor.increased_activity,
        contractor.opted_in_coaching,
        contractor.verification_status,
        contractor.current_stage
      ]);
    }

    console.log('✅ Test contractor seeding completed!');
    
    // Show summary of what was added
    console.log('\n📊 Test Data Summary:');
    console.log('Focus Areas to test:');
    const focusAreas = new Set();
    testContractors.forEach(c => {
      JSON.parse(c.focus_areas).forEach(area => focusAreas.add(area));
    });
    Array.from(focusAreas).forEach(area => console.log(`  - ${area}`));
    
    console.log('\nRevenue Ranges to test:');
    const revenueRanges = new Set();
    testContractors.forEach(c => revenueRanges.add(c.annual_revenue));
    Array.from(revenueRanges).forEach(range => console.log(`  - ${range}`));
    
    console.log('\nStages to test:');
    const stages = new Set();
    testContractors.forEach(c => stages.add(c.current_stage));
    Array.from(stages).forEach(stage => console.log(`  - ${stage}`));

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedTestContractors();