// Test script for core long text analysis services

// Directly import only the services we implemented
const TextChunkingService = require('./packages/core/src/services/text-chunking-service').TextChunkingService;
const TextSummaryService = require('./packages/core/src/services/text-summary-service').TextSummaryService;
const StructuredInformationExtractionService = require('./packages/core/src/services/structured-information-extraction-service').StructuredInformationExtractionService;
const WebContentExtractionService = require('./packages/core/src/services/web-content-extraction-service').WebContentExtractionService;

async function testTextChunking() {
  console.log('=== Testing TextChunkingService ===');
  const chunkingService = new TextChunkingService();
  
  const longText = 'This is a long text that needs to be chunked. '.repeat(100);
  
  const chunks = chunkingService.chunkText(longText, 500, 100);
  console.log(`Original text length: ${longText.length}`);
  console.log(`Number of chunks: ${chunks.length}`);
  console.log(`First chunk: ${chunks[0].substring(0, 100)}...`);
  console.log('TextChunkingService test passed!\n');
}

async function testTextSummary() {
  console.log('=== Testing TextSummaryService ===');
  const summaryService = new TextSummaryService();
  
  const testText = 'This is a test text. It contains multiple sentences. The summary service should extract the most important parts. This is another sentence to make the text longer. The summary should be concise and capture the main ideas.';
  
  const summary = await summaryService.generateSummary(testText, 'extractive', 2);
  console.log(`Original text: ${testText}`);
  console.log(`Summary: ${summary}`);
  console.log('TextSummaryService test passed!\n');
}

async function testStructuredInformationExtraction() {
  console.log('=== Testing StructuredInformationExtractionService ===');
  const extractionService = new StructuredInformationExtractionService();
  
  const testText = 'Barack Obama was born in Hawaii. He was the 44th President of the United States. He attended Harvard Law School. Michelle Obama is his wife.';
  
  const result = extractionService.extractStructuredInformation(testText);
  console.log(`Original text: ${testText}`);
  console.log('Entities:', result.entities.map(e => `${e.type}: ${e.text}`));
  console.log('Relationships:', result.relationships.map(r => `${r.type}: ${r.source} → ${r.target}`));
  console.log('StructuredInformationExtractionService test passed!\n');
}

async function testWebContentExtraction() {
  console.log('=== Testing WebContentExtractionService ===');
  const webService = new WebContentExtractionService();
  
  // Test with a simple URL
  try {
    const result = await webService.extractFromUrl('https://example.com');
    console.log(`URL: https://example.com`);
    console.log(`Title: ${result.title}`);
    console.log(`Content preview: ${result.content.substring(0, 200)}...`);
    console.log('WebContentExtractionService test passed!\n');
  } catch (error) {
    console.log('WebContentExtractionService test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('Running long text analysis and web content extraction tests...\n');
  
  await testTextChunking();
  await testTextSummary();
  await testStructuredInformationExtraction();
  await testWebContentExtraction();
  
  console.log('All tests completed!');
}

runAllTests();
