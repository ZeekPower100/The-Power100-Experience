// Create a simple test audio file for Whisper API testing
const fs = require('fs');

// Create a very simple WAV header for a silent audio file
function createSilentWav(durationSeconds = 1, sampleRate = 8000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize; // 44 bytes for header + data

  const buffer = Buffer.alloc(fileSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // byte rate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill with silence (zeros already from alloc)

  return buffer;
}

// Create a test audio file
const audioBuffer = createSilentWav(2); // 2 seconds of silence
fs.writeFileSync('test-audio.wav', audioBuffer);

console.log('✅ Created test-audio.wav (2 seconds of silence)');
console.log('Note: This is just for testing the API connection.');
console.log('Whisper will likely return empty transcription for silent audio.');