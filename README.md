# 🧠 Resume Tailor AI (Groq)

**A Chrome extension that instantly tailors your resume to ANY job description** using **Groq AI (LLaMA 3.1)**. It auto-extracts job descriptions from LinkedIn and Indeed, optimizes for ATS systems, rotates API keys to avoid rate limits, compresses long job posts, and caches results to save time and tokens.

> ✨ Turn job posts into interview-winning resume content in seconds.

---

## 🎯 Quick Demo

```
Open LinkedIn Job → Click Extension → Fetch JD → Enter Company → Tailor
↓
✅ Optimized professional summary
✅ 5–7 achievement-driven resume bullets
✅ ATS keyword alignment
✅ Quantifiable metrics added
✅ Smart 1-hour caching (no reprocessing)
```

---

## 🚀 Features

| Feature | Status |
|---------|--------|
| 🔍 Auto job description extraction (LinkedIn & Indeed optimized) | ✅ |
| 🤖 AI resume tailoring (Groq llama3.1-70b) | ✅ |
| 🔁 Multi-API key rotation (rate-limit protection) | ✅ |
| 💾 1-hour intelligent caching | ✅ |
| 📄 Base resume template support | ✅ |
| ⚙️ Options page (API keys + resume storage) | ✅ |
| ⏱️ 90-second timeout protection | ✅ |
| 🗜️ Auto-compression for long job descriptions | ✅ |

---

## 📦 Installation (1 minute)

```bash
git clone https://github.com/ssriramteja/JobFit-Resume-chrome-extension
cd JobFit-Resume-chrome-extension
```

Then in Chrome:

```
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project folder
```

Done. 🚀

---

## 🎮 How It Works

1. Open a job posting (LinkedIn, Indeed, or company site)
2. Click the extension icon
3. Click **Fetch JD** (or paste manually)
4. Enter the company name (Google, Amazon, etc.)
5. Click **Tailor**
6. Get customized, ATS-optimized resume content instantly ✨

---

## 🧾 Example Output

```
PROFESSIONAL SUMMARY
Senior Data Engineer with 7+ years building ML pipelines and scalable ETL systems.
Reduced data processing time by 87% and enabled real-time analytics.

SKILLS
Python, Spark, Airflow, Kafka, AWS (S3/Lambda), Snowflake, dbt

GOOGLE — Data Engineer (2023–Present)
• Engineered fraud detection pipeline handling 5M+ tx/day, reducing false positives by 40%
• Optimized ETL workflows (6h → 45min), enabling real-time reporting
```

---

## ⚙️ First-Time Setup

1. Get a **FREE Groq API key** → https://console.groq.com  
2. Right-click the extension icon → **Options**
3. Add:
   - One or more API keys  
   - Your **full base resume text**
4. Click **Save**

💡 **Tip:** Add **2–3 API keys** to enable automatic rotation and avoid rate limits.

---

## 🗂️ Project Structure

```
📄 manifest.json      Chrome MV3 configuration & permissions
🎨 popup.html         Extension popup interface
⚙️ popup.js           Popup logic + job description fetch
🧠 background.js      Groq API calls, caching, key rotation
🔍 content.js         LinkedIn/Indeed job description scraper
⚙️ options.html       Settings page UI
⚙️ options.js         API key + resume storage
📖 README.md          Documentation
```

---

## 🔐 Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Store API keys and cached tailored results |
| `activeTab` | Access current job posting page |
| `scripting` | Inject job description scraper |
| `<all_urls>` | Support LinkedIn, Indeed, and other job sites |

---

## 🛠️ Tech Stack

```
🤖 AI:        Groq API (llama3.1-70b-versatile)
🎨 Frontend:  Vanilla JavaScript + Chrome Extension APIs
💾 Storage:   Chrome Local Storage
🔍 Scraping:  Content Scripts
🏗️ Architecture: Manifest V3 Service Worker
```


---

## 💡 Pro Tips

- 🔑 Add multiple API keys → Never hit rate limits  
- ⏱️ Same job post within 1 hour → Served instantly from cache  
- 📝 Paste your full master resume in Options for best results  
- 🗜️ Long job descriptions are auto-compressed to save tokens  
- ⚡ 90-second timeout prevents hanging API calls  

---

## 🚀 Roadmap

| Feature | Status |
|---------|--------|
| Core AI tailoring engine | ✅ |
| LinkedIn/Indeed job extraction | ✅ |
| Multi-key rotation + caching | ✅ |
| Options page + JD compression | ✅ |
| Word / Google Docs export | ⏳ |
| Chrome Web Store publication | ⏳ |
| Support for 10+ additional job sites | ⏳ |

---

## 💰 Free Groq API Setup

```
1. Go to console.groq.com
2. Sign up (free tier includes generous tokens)
3. Create API key(s)
4. Open extension Options → Paste key(s)
5. Add multiple keys for automatic rotation ⚡
```

---

## 🤝 Contributing

```bash
1. Fork the repository
2. Create a feature branch: git checkout -b feature/new-feature
3. Commit changes: git commit -m "Add new feature"
4. Push branch: git push origin feature/new-feature
5. Open a Pull Request 🚀
```

---


**Tailored 1000+ resumes**  
⭐ Star the repo if it helps you land interviews!
