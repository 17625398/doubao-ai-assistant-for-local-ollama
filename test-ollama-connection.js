async function testOllamaConnection() {
  const fetch = (await import('node-fetch')).default;
  try {
    console.log('Testing Ollama connection at http://192.168.0.32:11434/api/tags...');
    const response = await fetch('http://192.168.0.32:11434/api/tags', {
      method: 'GET',
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Ollama service is available.');
      console.log('Models:', data.models);
    } else {
      console.log('Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

testOllamaConnection();