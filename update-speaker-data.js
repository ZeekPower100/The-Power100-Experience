const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!',
  port: 5432
});

const personalizationData = {
  contractor_name: "Zeek Test",
  event_name: "Power100 Summit 2025",
  recommended_speakers: [
    {
      speaker_id: 1,
      name: "Sarah Johnson",
      session_title: "Building Scalable Teams"
    },
    {
      speaker_id: 2,
      name: "Mike Davis",
      session_title: "Revenue Growth Strategies"
    },
    {
      speaker_id: 3,
      name: "Greg Salafia",
      session_title: "Leadership Excellence"
    }
  ]
};

async function updateMessage() {
  try {
    await client.connect();

    const result = await client.query(
      'UPDATE event_messages SET personalization_data = $1 WHERE id = 44 RETURNING id, personalization_data',
      [JSON.stringify(personalizationData)]
    );

    console.log('✅ Updated message:', result.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

updateMessage();
