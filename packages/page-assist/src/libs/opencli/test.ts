import { getOpenCLIService, checkOpenCLIStatus, executeOpenCLIAction } from './index';

async function testOpenCLIConnection() {
  console.log('Testing OpenCLI connection...');
  
  try {
    const status = await checkOpenCLIStatus();
    console.log('Connection status:', status);
    
    if (status.connected) {
      console.log('OpenCLI is connected!');
      
      // Test a simple command
      try {
        const result = await executeOpenCLIAction('exec', {
          code: 'document.title',
          workspace: 'test'
        });
        console.log('Exec test result:', result);
      } catch (error) {
        console.error('Exec test failed:', error);
      }
    } else {
      console.log('OpenCLI is not connected:', status.error);
    }
  } catch (error) {
    console.error('Error checking OpenCLI status:', error);
  }
}

async function testOpenCLIService() {
  console.log('Testing OpenCLIService...');
  
  const service = getOpenCLIService({ autoInitialize: true });
  
  try {
    const 诊断结果 = await service.diagnose();
    console.log('Diagnostic result:', 诊断结果);
    
    if (诊断结果.daemonRunning) {
      console.log('Daemon is running');
    } else {
      console.log('Daemon is not running');
    }
    
    if (诊断结果.extensionConnected) {
      console.log('Extension is connected');
    } else {
      console.log('Extension is not connected');
    }
  } catch (error) {
    console.error('Error testing OpenCLIService:', error);
  }
}

// Run tests
if (typeof window === 'undefined') {
  // Node.js environment
  testOpenCLIConnection().then(() => testOpenCLIService());
} else {
  // Browser environment
  (window as any).testOpenCLI = {
    testConnection: testOpenCLIConnection,
    testService: testOpenCLIService
  };
  console.log('OpenCLI test functions available at window.testOpenCLI');
}
