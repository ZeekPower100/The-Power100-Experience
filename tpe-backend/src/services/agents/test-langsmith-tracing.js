// Test script to verify LangSmith tracing is working
// Run: node test-langsmith-tracing.js

require('dotenv').config({ path: '../../../.env' });
const { createStandardAgent } = require('./aiConciergeStandardAgent');

async function testLangSmithTracing() {
  console.log('\n================================================================================');
  console.log('Testing LangSmith Tracing Integration');
  console.log('================================================================================\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   LANGSMITH_API_KEY: ${process.env.LANGSMITH_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   LANGSMITH_PROJECT: ${process.env.LANGSMITH_PROJECT || '❌ Not set'}`);
  console.log(`   LANGSMITH_TRACING: ${process.env.LANGSMITH_TRACING || '❌ Not set'}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);

  if (!process.env.LANGSMITH_API_KEY) {
    console.log('\n❌ ERROR: LANGSMITH_API_KEY not set in .env file');
    console.log('   Please add your API key and restart the test.');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('\n❌ ERROR: OPENAI_API_KEY not set in .env file');
    process.exit(1);
  }

  console.log('\n✅ All required environment variables are set!\n');

  try {
    console.log('🤖 Creating Standard Agent with LangSmith tracing...');
    const agent = createStandardAgent();
    console.log('✅ Agent created successfully!\n');

    console.log('📤 Sending test message to agent...');
    console.log('   Message: "Hi! What can you help me with?"\n');

    const messages = [
      { role: 'user', content: 'Hi! What can you help me with?' }
    ];

    const result = await agent.invoke(
      { messages },
      {
        configurable: {
          thread_id: 'test-langsmith-' + Date.now()
        }
      }
    );

    console.log('✅ Agent response received!\n');
    console.log('📝 Response:');
    console.log('────────────────────────────────────────────────────────────────────────────────');

    // Get the last message (AI response)
    const lastMessage = result.messages[result.messages.length - 1];
    console.log(lastMessage.content);
    console.log('────────────────────────────────────────────────────────────────────────────────\n');

    console.log('🎉 SUCCESS! LangSmith tracing test complete!');
    console.log('\n📊 Next Steps:');
    console.log('   1. Go to: https://smith.langchain.com');
    console.log(`   2. Navigate to project: ${process.env.LANGSMITH_PROJECT}`);
    console.log('   3. You should see a new trace with:');
    console.log('      ✅ Agent invocation');
    console.log('      ✅ User message: "Hi! What can you help me with?"');
    console.log('      ✅ AI response');
    console.log('      ✅ Token usage metrics');
    console.log('      ✅ Latency information\n');

    console.log('================================================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR during test:');
    console.error(error);
    console.log('\n📋 Troubleshooting:');
    console.log('   1. Check that backend server is running');
    console.log('   2. Verify LANGSMITH_API_KEY is correct');
    console.log('   3. Verify OPENAI_API_KEY is correct');
    console.log('   4. Check backend logs for errors\n');
    process.exit(1);
  }
}

// Run the test
testLangSmithTracing();
