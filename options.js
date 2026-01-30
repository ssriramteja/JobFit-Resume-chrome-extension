let apiKeys = [];

document.addEventListener('DOMContentLoaded', () => {
  const apiKeysEl = document.getElementById('apiKeys');
  const resumeEl = document.getElementById('resume');
  const statusEl = document.getElementById('status');

  // Save settings
  document.getElementById('save').addEventListener('click', async () => {
    const keyLines = apiKeysEl.value
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    apiKeys = keyLines.map((key, index) => ({
      key,
      status: 'unknown',
      label: `Key ${index + 1}`
    }));

    const resume = resumeEl.value.trim();
    
    await chrome.storage.local.set({ 
      apiKeys, 
      baseResume: resume,
      currentKeyIndex: 0 
    });
    
    statusEl.textContent = `✓ Saved ${apiKeys.length} API key(s) and resume!`;
    setTimeout(() => statusEl.textContent = '', 3000);
  });

  // Test first key
  document.getElementById('test').addEventListener('click', async () => {
    const firstKey = apiKeysEl.value
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)[0];
    
    if (!firstKey) {
      statusEl.textContent = '❌ Enter at least one API key first.';
      return;
    }
    
    statusEl.textContent = '⏳ Testing first key...';
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firstKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        })
      });
      
      statusEl.textContent = response.ok ? '✓ API key works!' : `❌ API error: ${response.status}`;
    } catch (e) {
      statusEl.textContent = `❌ Error: ${e.message}`;
    }
  });

  // Load saved
  chrome.storage.local.get(['apiKeys', 'baseResume'], (data) => {
    if (data.apiKeys && data.apiKeys.length > 0) {
      apiKeys = data.apiKeys;
      apiKeysEl.value = data.apiKeys.map(k => k.key).join('\n');
    }
    if (data.baseResume) resumeEl.value = data.baseResume;
  });
});
