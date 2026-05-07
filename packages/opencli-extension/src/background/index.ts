interface DaemonStatus {
  connected: boolean;
  reconnecting?: boolean;
}

let daemonConnected = false;
let reconnecting = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getStatus') {
    sendResponse({
      connected: daemonConnected,
      reconnecting: reconnecting,
    });
  }
});

async function checkDaemonConnection(): Promise<void> {
  reconnecting = true;
  daemonConnected = false;

  try {
    const response = await fetch('http://localhost:3500/api/status');
    if (response.ok) {
      daemonConnected = true;
    }
  } catch {
    daemonConnected = false;
  } finally {
    reconnecting = false;
  }
}

checkDaemonConnection();

setInterval(checkDaemonConnection, 5000);