chrome.runtime.sendMessage({ type: 'getStatus' }, resp => {
  const dot = document.getElementById('dot')
  const status = document.getElementById('status')
  const hint = document.getElementById('hint')

  if (chrome.runtime.lastError || !resp) {
    dot?.classList.add('disconnected')
    dot?.classList.remove('connected', 'connecting')
    if (status) {
      status.innerHTML = '<strong>No daemon connected</strong>'
    }
    if (hint) {
      hint.style.display = 'block'
    }
    return
  }

  if (resp.connected) {
    dot?.classList.add('connected')
    dot?.classList.remove('disconnected', 'connecting')
    if (status) {
      status.innerHTML = '<strong>Connected to daemon</strong>'
    }
    if (hint) {
      hint.style.display = 'none'
    }
  } else if (resp.reconnecting) {
    dot?.classList.add('connecting')
    dot?.classList.remove('connected', 'disconnected')
    if (status) {
      status.innerHTML = '<strong>Reconnecting...</strong>'
    }
    if (hint) {
      hint.style.display = 'none'
    }
  } else {
    dot?.classList.add('disconnected')
    dot?.classList.remove('connected', 'connecting')
    if (status) {
      status.innerHTML = '<strong>No daemon connected</strong>'
    }
    if (hint) {
      hint.style.display = 'block'
    }
  }
})