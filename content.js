function extractJobDescription() {
  console.log('=== Extracting job description ===');
  console.log('URL:', window.location.href);
  
  if (window.location.hostname.includes('linkedin.com')) {
    // First, try to expand "show more" if it exists
    const showMoreSelectors = [
      'button[aria-label*="Show more"]',
      'button[aria-label*="show more"]',
      'button.show-more-less-html__button',
      'button[data-tracking-control-name*="show-more"]',
      '.jobs-description__footer-button'
    ];
    
    for (const sel of showMoreSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        console.log('Clicking show more button');
        btn.click();
      }
    }
    
    // LinkedIn job page selectors (try all of them)
    const selectors = [
      '.jobs-description-content__text',
      '.jobs-description__content',
      '.show-more-less-html__markup',
      '.jobs-box__html-content',
      'div[class*="jobs-description"]',
      '.description__text',
      '#job-details',
      'article.jobs-description'
    ];
    
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        // Get ALL text including nested elements
        const text = el.innerText || el.textContent || '';
        console.log(`Selector: ${sel} → ${text.length} chars`);
        
        if (text.length > 100) {
          const cleaned = cleanText(text);
          if (cleaned.length > 100) {
            console.log('✓ SUCCESS: Extracted', cleaned.length, 'chars from', sel);
            return cleaned;
          }
        }
      }
    }
    
    // Fallback: Get ALL visible text from the main content area
    const mainContent = document.querySelector('main') || document.querySelector('.scaffold-layout__main');
    if (mainContent) {
      const allText = mainContent.innerText || '';
      console.log('Fallback: main content has', allText.length, 'chars');
      if (allText.length > 500) {
        const cleaned = cleanText(allText);
        return cleaned.substring(0, 5000);
      }
    }
  }
  
  console.error('❌ Could not extract job description');
  return '';
}

function cleanText(text) {
  if (!text) return '';
  
  // Remove lines that are clearly navigation/UI elements
  const lines = text.split('\n').filter(line => {
    const l = line.trim();
    return l.length > 15 && 
           !l.match(/^(Home|Jobs|Messaging|Notifications|Me|Try Premium)$/i) &&
           !l.startsWith('var ') && 
           !l.startsWith('function') &&
           !l.includes('SPDX-License') &&
           !l.includes('Copyright ©');
  });
  
  return lines.join('\n').trim();
}

function extractCompanyName() {
  console.log('=== Extracting company name ===');
  
  if (window.location.hostname.includes('linkedin.com')) {
    // Try multiple LinkedIn company selectors
    const selectors = [
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
      '.topcard__org-name-link',
      'a[href*="/company/"]'
    ];
    
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const company = (el.innerText || el.textContent || '').trim();
        if (company && company.length > 0 && company.length < 100) {
          console.log('✓ Found company:', company);
          return company;
        }
      }
    }
    
    // Extract from page title
    const title = document.title;
    // Format: "Senior Data Engineer - Crusoe | LinkedIn"
    const match = title.match(/[-–]\s*([^-–|]+?)\s*[|]/);
    if (match && match[1]) {
      console.log('✓ Found company from title:', match[1].trim());
      return match[1].trim();
    }
  }
  
  console.warn('⚠ Could not find company name');
  return 'Unknown Company';
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === 'GET_JOB_DATA') {
    console.log('📩 Received GET_JOB_DATA request');
    
    // For LinkedIn, wait 3 seconds to let dynamic content load
    const isLinkedIn = window.location.hostname.includes('linkedin.com');
    const delay = isLinkedIn ? 3000 : 500;
    
    console.log(`⏳ Waiting ${delay}ms for page to load...`);
    
    setTimeout(() => {
      const jd = extractJobDescription();
      const company = extractCompanyName();
      
      console.log('=== FINAL RESULTS ===');
      console.log('Job Description length:', jd.length);
      console.log('Company:', company);
      console.log('First 300 chars:', jd.substring(0, 300));
      
      if (jd.length < 100) {
        console.error('⚠️ WARNING: Job description too short!');
        console.error('Manual action needed:');
        console.error('1. Scroll to job description');
        console.error('2. Click "show more" if visible');
        console.error('3. Wait 5 seconds');
        console.error('4. Try fetch again');
      }
      
      sendResponse({
        jobDescription: jd,
        companyName: company
      });
    }, delay);
    
    return true; // Keep message channel open
  }
});

console.log('✅ Resume Tailor content script loaded (LinkedIn optimized v4)');
