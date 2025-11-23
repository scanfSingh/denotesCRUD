#!/usr/bin/env node

/**
 * Script to download Whisper model for whisper-node
 * Usage: node scripts/download-whisper-model.js [model-name]
 * Default model: base.en
 */

const { execSync } = require('child_process');
const readline = require('readline');

const model = process.argv[2] || 'base.en';

console.log(`Downloading Whisper model: ${model}`);
console.log('This may take a few minutes depending on your internet connection...\n');

try {
  // Use npx to run the whisper-node download command
  execSync(`npx whisper-node download ${model}`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log(`\n✅ Successfully downloaded model: ${model}`);
  console.log('You can now use audio transcription in the app!');
} catch (error) {
  console.error('\n❌ Error downloading model:', error.message);
  console.log('\nYou can try downloading manually:');
  console.log(`  npx whisper-node download ${model}`);
  process.exit(1);
}

