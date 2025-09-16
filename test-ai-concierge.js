const axios = require('axios');

async function testAIConcierge() {
  console.log('🤖 Testing AI Concierge with real partner integration...\n');

  // Test message asking about partners
  const testMessages = [
    "I need help improving my marketing and lead generation. What partners do you recommend?",
    "We're struggling with operational efficiency. Who in your network can help?",
    "I want to close more deals. Which partners specialize in sales training?"
  ];

  for (const message of testMessages) {
    console.log(`📤 User: ${message}`);

    try {
      const response = await axios.post('http://localhost:5000/api/ai-concierge/message', {
        content: message,
        conversationId: 'test-' + Date.now()
      });

      const data = response.data;

      if (data.success && data.aiResponse) {
        console.log(`\n🤖 AI Concierge Response:\n${data.aiResponse.content}\n`);
        console.log('─'.repeat(80) + '\n');
      } else {
        console.error('❌ Error:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Request failed:', error.message);
    }

    // Wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testAIConcierge();