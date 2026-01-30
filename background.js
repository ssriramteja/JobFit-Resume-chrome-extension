chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TAILOR_RESUME') {
    handleTailor(request.payload)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Cache to avoid re-generating same resume
const resumeCache = new Map();

function getCacheKey(jd, company) {
  return `${company}_${jd.substring(0, 200)}`.toLowerCase().replace(/\s+/g, '_');
}

async function handleTailor({ jobDescription, companyName }) {
  // Check cache first (1 hour validity)
  const cacheKey = getCacheKey(jobDescription, companyName);
  if (resumeCache.has(cacheKey)) {
    const cached = resumeCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3600000) {
      return `[CACHED RESULT - Generated at ${new Date(cached.timestamp).toLocaleTimeString()}]\n\n${cached.result}`;
    }
  }

  const { apiKeys, baseResume, currentKeyIndex = 0 } = 
    await chrome.storage.local.get(['apiKeys', 'baseResume', 'currentKeyIndex']);
  
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error('No API keys configured. Open Options and add at least one.');
  }
  if (!baseResume) {
    throw new Error('Base resume not configured. Open Options and add it.');
  }

  // Compress very long JDs to save tokens and speed up
  let processedJD = jobDescription;
  if (jobDescription.length > 3500) {
    console.log('JD too long, compressing...');
    processedJD = await compressJobDescription(jobDescription, apiKeys[currentKeyIndex].key);
  }

  const prompt = buildResumePrompt({
    jobDescription: processedJD,
    companyName,
    resumeText: baseResume
  });

  let lastError = null;
  const totalKeys = apiKeys.length;

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const keyIndex = (currentKeyIndex + attempt) % totalKeys;
    const apiKeyObj = apiKeys[keyIndex];
    const apiKey = apiKeyObj.key;

    try {
      const result = await callGroqWithKey({ apiKey, prompt });

      // Cache result
      resumeCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      // Keep cache size manageable
      if (resumeCache.size > 20) {
        const firstKey = resumeCache.keys().next().value;
        resumeCache.delete(firstKey);
      }

      apiKeys[keyIndex].status = 'active';
      await chrome.storage.local.set({
        apiKeys,
        currentKeyIndex: keyIndex
      });

      return result;
    } catch (err) {
      lastError = err;

      const msg = err.message.toLowerCase();
      if (msg.includes('429') || msg.includes('rate limit')) {
        console.log(`Key ${keyIndex + 1} hit rate limit, rotating...`);
        apiKeys[keyIndex].status = 'limited';
        await chrome.storage.local.set({ apiKeys });
        continue;
      } else {
        throw err;
      }
    }
  }

  throw new Error(`All ${totalKeys} API keys failed or are rate-limited. ${lastError?.message || ''}`);
}

// Compress long JDs to reduce tokens and speed up generation
async function compressJobDescription(jd, apiKey) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: `Extract ONLY the key requirements, skills, responsibilities, qualifications, and important keywords from this job description. Be concise but complete. Format as a structured list:\n\n${jd}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      // Safe check before accessing content
      if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        console.log('JD compressed successfully');
        return data.choices[0].message.content.trim();
      }
    }
  } catch (e) {
    console.warn('JD compression failed, using original:', e);
  }
  return jd; // Always return original if compression fails
}

async function callGroqWithKey({ apiKey, prompt }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume writer and ATS optimizer specialized in data science, ML, NLP, and data engineering roles. You create 100/100 ResumeWorded score resumes with perfect keyword optimization and quantifiable achievements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.65,
        max_tokens: 4000,
        top_p: 0.95
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error('429: rate limit exceeded');
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    // Detailed error checking
    if (!data) {
      throw new Error('Empty response from Groq API');
    }
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('No choices returned from Groq API. Response: ' + JSON.stringify(data));
    }
    if (!data.choices[0].message) {
      throw new Error('No message in response. Response: ' + JSON.stringify(data.choices[0]));
    }
    if (!data.choices[0].message.content) {
      throw new Error('No content in message. Response: ' + JSON.stringify(data.choices[0].message));
    }
    
    return data.choices[0].message.content.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 90 seconds. Try with a shorter job description.');
    }
    throw err;
  }
}

function buildResumePrompt({ jobDescription, companyName, resumeText }) {
  return `
You are an expert resume writer and ATS optimizer creating a 100/100 ResumeWorded score resume.

**CRITICAL INSTRUCTIONS:**

1. **Job Description Analysis:**
   - Extract ALL keywords, technical skills, core competencies, and qualifications
   - Identify the specific domain/industry (Banking, Healthcare, Retail, FinTech, E-commerce, Insurance, etc.)
   - Note required experience level and key technologies

2. **Domain Transformation:**
   - **IGNORE my current domain** — completely transform my experience to match the JD's industry
   - Change client names, project contexts, and domain language to fit the target industry
   - Make it appear as if I have deep, direct experience in the JD's exact domain
   - Rewrite role titles to match or slightly exceed JD requirements

3. **Quantifiable Impact (MANDATORY):**
   - EVERY bullet MUST include a metric: % improvement, $ saved, time reduced, scale, volume
   - Use realistic but impressive numbers based on the role level
   - Format: "[Action verb] + [specific task] + [quantifiable result] + [business impact]"
   - Examples:
     * "Engineered real-time fraud detection pipeline processing 5M+ transactions daily, reducing false positives by 40% and saving $2.3M annually"
     * "Architected scalable NLP system handling 50K+ daily queries, improving search relevance by 35% and boosting user engagement 28%"
     * "Optimized ETL pipelines reducing data processing time from 6 hours to 45 minutes (87% improvement), enabling real-time analytics"

4. **Action Verb Diversity (CRITICAL):**
   - Use 50+ different strong action verbs across the resume
   - NEVER repeat the same verb
   - Mix: Engineered, Architected, Spearheaded, Orchestrated, Optimized, Pioneered, Streamlined, Championed, Automated, Transformed, Delivered, Built, Designed, Implemented, Led, Developed, Created, Established, Enhanced, Accelerated, Modernized, Integrated, Launched, Deployed, Scaled, etc.

5. **Skills Section (SPACE-EFFICIENT, ONE-LINE FORMAT):**
   - ONE compact line per category (comma-separated skills)
   - Include ALL JD keywords
   - Group logically by function
   - Should NOT occupy more than 6-8 lines total
   - Example format:
   **Programming & Data:** Python, SQL, R, Scala, Java, PySpark
   **ML & AI:** PyTorch, TensorFlow, scikit-learn, Transformers, spaCy, Hugging Face, LLMs, NLP
   **Data Engineering:** Airflow, Spark, Kafka, ETL/ELT, Data Warehousing, dbt, Snowflake
   **Cloud & DevOps:** AWS (S3, Lambda, SageMaker), Azure, GCP, Docker, Kubernetes, CI/CD
   **BI & Visualization:** Tableau, Power BI, Looker, SQL Analytics, A/B Testing
   **Databases:** PostgreSQL, MySQL, MongoDB, Redis, Cassandra, DynamoDB

6. **Work Experience Structure:**
   - 4-6 bullets per role (5 is ideal)
   - Each bullet: 1-2 lines maximum
   - Start with role title matching or exceeding JD title
   - Company/client renamed to fit JD industry context
   - Dates must be continuous (check for gaps)



8. **ATS Optimization:**
   - Mirror JD phrasing exactly for critical requirements
   - Use standard section headers (no creative names)
   - No tables, columns, graphics, or complex formatting
   - Keywords naturally integrated throughout (not keyword-stuffed)
   - Avoid: "Responsible for", "Worked on", "Helped with" — use strong action verbs

9. **Certifications:**
   - Replace/add certifications matching JD domain
   - Examples: AWS Certified Solutions Architect, Azure Data Engineer, Databricks, Google Professional ML Engineer, Tableau
   - If JD mentions specific certs, include them or equivalent

10. **Professional Summary:**
    - 3-4 lines maximum
    - Senior-level tone
    - Include: years of experience, domain/industry, top 3-4 technical skills from JD, key achievement with metric
    - Must be keyword-dense but read naturally

--------------------------------------------------
OUTPUT FORMAT (STRICT)
--------------------------------------------------

### PROFESSIONAL SUMMARY
[3-4 lines: Domain-aligned, senior-level, keyword-rich, with one quantifiable highlight]

### SKILLS
**Programming & Data:** [comma-separated list]
**Machine Learning & AI:** [comma-separated list]
**Data Engineering & Pipelines:** [comma-separated list]
**Cloud & Infrastructure:** [comma-separated list]
**Analytics & BI Tools:** [comma-separated list]
**Databases:** [comma-separated list]

### WORK EXPERIENCE

**[Job Title matching/exceeding JD]** — [Company in JD's industry]  
[City, State] | [Month Year – Present/Month Year]
- [Unique action verb] + [domain-specific task] + [quantifiable metric with %/$/#] + [business impact]
- [Different action verb] + [JD keyword-rich responsibility] + [metric] + [impact]
- [Another verb] + [technical implementation] + [scale/volume metric] + [measurable result]
- [Verb] + [leadership or collaboration element] + [metric] + [business outcome]
- [Verb] + [innovation or optimization] + [before/after metric] + [impact]

**[Previous Role Title]** — [Company in JD's industry]  
[City, State] | [Month Year – Month Year]
- [Bullet with unique verb + metric]
- [Bullet with unique verb + metric]
- [Bullet with unique verb + metric]
- [Bullet with unique verb + metric]

**[Earlier Role]** — [Company]  
[City, State] | [Month Year – Month Year]
- [Bullet with unique verb + metric]
- [Bullet with unique verb + metric]
- [Bullet with unique verb + metric]

### PROJECTS (Optional, only if highly relevant to JD)
**[Project Name matching JD domain]**
- [1-line description with tech stack from JD and quantifiable outcome]

### EDUCATION
**[Degree]** in [Field]  
[University] | [Graduation Year]

### CERTIFICATIONS
- [Certification 1 aligned to JD domain]
- [Certification 2 aligned to JD domain]
- [Certification 3 if applicable]


--------------------------------------------------
INPUT DATA
--------------------------------------------------

**Job Description:**
${jobDescription}

**Company:**
${companyName}

**My Current Resume:**
${resumeText}

**CRITICAL FINAL REMINDERS:**
- Do NOT invent fake companies or change actual employment dates/years
- DO transform: role titles, company names, and domain context to match the JD's industry
`;
}
