/**
 * Test script for AI Concierge file processing
 * Tests Vision API for images and Whisper API for audio
 */

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testImageUpload() {
  console.log('\n📷 Testing Image Upload with Vision API...');

  // Create a simple test image (you can replace this with an actual image path)
  const testImagePath = 'C:/Users/broac/Downloads/Power100-Experience-09-15-2025_12_59_PM.png';

  if (!fs.existsSync(testImagePath)) {
    console.log('⚠️ Test image not found. Please provide a valid image path.');
    return;
  }

  const formData = new FormData();
  formData.append('media', fs.createReadStream(testImagePath));
  formData.append('content', 'Please analyze this image');
  formData.append('mediaType', 'image');

  try {
    const response = await axios.post('http://localhost:5000/api/ai-concierge/message', formData, {
      headers: formData.getHeaders()
    });

    console.log('✅ Image upload response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Image upload failed:', error.response?.data || error.message);
  }
}

async function testAudioUpload() {
  console.log('\n🎤 Testing Audio Upload with Whisper API...');

  // Create a simple test audio file (you'd need an actual audio file)
  const testAudioPath = 'test-audio.wav';

  if (!fs.existsSync(testAudioPath)) {
    console.log('⚠️ Test audio not found. Skipping audio test.');
    return;
  }

  const formData = new FormData();
  formData.append('media', fs.createReadStream(testAudioPath));
  formData.append('content', 'Voice message');
  formData.append('mediaType', 'audio');

  try {
    const response = await axios.post('http://localhost:5000/api/ai-concierge/message', formData, {
      headers: formData.getHeaders()
    });

    console.log('✅ Audio upload response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Audio upload failed:', error.response?.data || error.message);
  }
}

async function testTextMessage() {
  console.log('\n💬 Testing Text Message...');

  try {
    const response = await axios.post('http://localhost:5000/api/ai-concierge/message', {
      content: 'What partners do you recommend for revenue growth?'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Text message response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Text message failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting AI Concierge File Processing Tests...');
  console.log('================================================');

  // Test text message first
  await testTextMessage();

  // Test image upload
  await testImageUpload();

  // Test audio upload
  await testAudioUpload();

  console.log('\n✅ Tests completed!');
}

// Check if required modules are installed
try {
  require('form-data');
  require('axios');
} catch (error) {
  console.log('📦 Installing required test dependencies...');
  require('child_process').execSync('npm install form-data axios', { stdio: 'inherit' });
}

runTests();