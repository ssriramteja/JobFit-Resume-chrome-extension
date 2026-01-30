const jdEl = document.getElementById('jd');
const companyEl = document.getElementById('company');
const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const progressEl = document.getElementById('progress');
const tailorBtn = document.getElementById('tailorBtn');
const fetchBtn = document.getElementById('fetchBtn');

document.getElementById('fetchBtn').addEventListener('click', async () => {
  statusEl.innerHTML = '<div class="status info">⏳ Fetching job data from page...</div>';
  fetchBtn.disabled = true;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_DATA' });
    
    jdEl.value = response.jobDescription || '';
    companyEl.value = response.companyName || '';
    
    statusEl.innerHTML = '<div class="status success">✓ Job data fetched. You can edit it if needed.</div>';
  } catch (e) {
    statusEl.innerHTML = `<div class="status error">❌ Could not fetch job data: ${e.message}<br>Please paste the job description manually.</div>`;
  } finally {
    fetchBtn.disabled = false;
  }
});

document.getElementById('tailorBtn').addEventListener('click', async () => {
  const jobDescription = jdEl.value.trim();
  const companyName = companyEl.value.trim();
  
  if (!jobDescription || !companyName) {
    statusEl.innerHTML = '<div class="status error">❌ Please provide both job description and company name.</div>';
    return;
  }
  
  tailorBtn.disabled = true;
  progressEl.style.display = 'block';
  statusEl.innerHTML = '<div class="status info">⏳ Tailoring resume with Groq AI...<br><small>This may take 15-45 seconds for detailed analysis.</small></div>';
  outputEl.textContent = '';
  
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'TAILOR_RESUME',
      payload: { jobDescription, companyName }
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    outputEl.textContent = result.result;
    
    if (result.result.startsWith('[CACHED')) {
      statusEl.innerHTML = '<div class="status success">✓ Tailored resume generated (from cache)!</div>';
    } else {
      statusEl.innerHTML = '<div class="status success">✓ Tailored resume generated with full ATS analysis!</div>';
    }
    
    displayKeyStatus();
  } catch (e) {
    statusEl.innerHTML = `<div class="status error">❌ ${e.message}</div>`;
  } finally {
    tailorBtn.disabled = false;
    progressEl.style.display = 'none';
  }
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = outputEl.textContent;
  if (!text) {
    statusEl.innerHTML = '<div class="status error">❌ No resume to copy. Generate one first.</div>';
    return;
  }
  
  await navigator.clipboard.writeText(text);
  statusEl.innerHTML = '<div class="status success">✓ Copied to clipboard! Now paste into your Google Doc or Word.</div>';
});

async function displayKeyStatus() {
  const { apiKeys, currentKeyIndex = 0 } = await chrome.storage.local.get(['apiKeys', 'currentKeyIndex']);
  const statusDiv = document.getElementById('keyStatus');
  
  if (!apiKeys || apiKeys.length === 0) {
    statusDiv.textContent = '⚠️ No API keys configured. Go to Options to add keys.';
    return;
  }
  
  const active = apiKeys.filter(k => k.status === 'active').length;
  const limited = apiKeys.filter(k => k.status === 'limited').length;
  const expired = apiKeys.filter(k => k.status === 'expired').length;
  
  let statusText = `Active: ${active} | Limited: ${limited} | Expired: ${expired}`;
  statusDiv.textContent = statusText;
}
