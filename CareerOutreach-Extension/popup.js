console.log("CareerOutreach: popup.js loaded successfully!");

// קורות חיים כברירת מחדל מותאמים אישית עבורך
const defaultCV = `אביה ארזה
תל אביב
תפקידים מבוקשים: Data Analyst / BI Developer / System Integrator

תמצית מקצועית:
דאטה אנליסטית ומפתחת BI בעלת ניסיון מוכח באפיון וניהול מסדי נתונים, אופטימיזציית שאילתות מורכבות, בניית תהליכי ETL, ואוטומציה של מערכות ודוחות. מומחית בחיבור תשתיות נתונים וממשקי APIs לפיתוח פתרונות B2B חכמים.

ניסיון מקצועי ופרויקטים:
* פיתוח עצמאי - מערכת Ocular: אפיון ופיתוח מערכת מבוססת AI לסריקת מסמכים וסינון לשוק הביטוח הישראלי, תוך שימוש ואינטגרציה עם בסיס הנתונים Firebase.
* פיתוח תוסף כרום חכם: אפיון ובניית תוסף לייעול תהליכי חיפוש עבודה באמצעות סריקת משרות והתאמת קורות חיים מבוססת AI.
* ניתוח נתונים ו-BI: כתיבת שאילתות SQL מורכבות, פיתוח דשבורדים תומכי החלטה, ואופטימיזציית ביצועים במסדי נתונים.
* מודלים ואוטומציה: בניית מודלים פיננסיים ועסקיים מתקדמים ב-Excel ו-Power Query. כתיבת סקריפטים ומאקרוס ב-VBA לאוטומציה מלאה של דוחות שוטפים.

כישורים טכנולוגיים:
SQL (Complex Queries, Window Functions, CTEs), BI Database Management, Excel (Power Query, Advanced Modeling), VBA, Firebase, Google AI Studio APIs, System Integrations & B2B AI Agents.`;

let tailoredResumeEnHtml = "";
let tailoredResumeHeHtml = "";
let currentJobData = null; 
let watchedCompanies = []; 

// ==========================================
// הדביקי כאן את מפתח ה-API האישי שלך (המתחיל ב-AIza)
// ==========================================
const apiKey = "AQ.Ab8RN6KbxMv1R0YYsMDfQYrgKyxCIElOFK-MXt1IQzEoPd8gnw"; 

document.addEventListener('DOMContentLoaded', async () => {
  console.log("CareerOutreach: DOM fully loaded.");

  const tabAnalyzeBtn = document.getElementById('tab-analyze-btn');
  const tabGlobalBtn = document.getElementById('tab-global-btn');
  const tabCvBtn = document.getElementById('tab-cv-btn');
  const tabTrackerBtn = document.getElementById('tab-tracker-btn');
  const tabCompaniesBtn = document.getElementById('tab-companies-btn');
  
  const saveCvBtn = document.getElementById('save-cv-btn');
  const analyzeBtn = document.getElementById('analyze-btn');
  const cvTextArea = document.getElementById('cv-text');
  const output = document.getElementById('output');
  const resultsDiv = document.getElementById('results');
  const saveStatus = document.getElementById('save-status');
  const uploadBtn = document.getElementById('upload-btn');
  const cvFileInput = document.getElementById('cv-file-input');
  
  const downloadContainer = document.getElementById('download-container');
  const downloadEnBtn = document.getElementById('download-en-btn');
  const downloadHeBtn = document.getElementById('download-he-btn');
  const markAppliedBtn = document.getElementById('mark-applied-btn');
  const appliedStatus = document.getElementById('applied-status');
  const clearTrackerBtn = document.getElementById('clear-tracker-btn');

  const globalSearchBtn = document.getElementById('global-search-btn');
  const addCompanyBtn = document.getElementById('add-company-btn');
  const scanAllBtn = document.getElementById('scan-all-btn');
  const getSuggestionsBtn = document.getElementById('get-suggestions-btn');
  const suggestionsList = document.getElementById('suggestions-list');

  // 1. ניהול טאבים (5 טאבים)
  if (tabAnalyzeBtn && tabGlobalBtn && tabCvBtn && tabTrackerBtn && tabCompaniesBtn) {
    tabAnalyzeBtn.addEventListener('click', () => switchTab('analyze'));
    tabGlobalBtn.addEventListener('click', () => switchTab('global'));
    tabCvBtn.addEventListener('click', () => switchTab('cv'));
    tabTrackerBtn.addEventListener('click', () => switchTab('tracker'));
    tabCompaniesBtn.addEventListener('click', () => switchTab('companies'));
  }

  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'analyze') {
      if (tabAnalyzeBtn) tabAnalyzeBtn.classList.add('active');
      document.getElementById('tab-analyze').classList.add('active');
    } else if (tabName === 'global') {
      if (tabGlobalBtn) tabGlobalBtn.classList.add('active');
      document.getElementById('tab-global').classList.add('active');
    } else if (tabName === 'cv') {
      if (tabCvBtn) tabCvBtn.classList.add('active');
      document.getElementById('tab-cv').classList.add('active');
    } else if (tabName === 'tracker') {
      if (tabTrackerBtn) tabTrackerBtn.classList.add('active');
      document.getElementById('tab-tracker').classList.add('active');
      renderTrackerList();
    } else {
      if (tabCompaniesBtn) tabCompaniesBtn.classList.add('active');
      document.getElementById('tab-companies').classList.add('active');
      loadCompanies(); 
    }
  }

  // מנגנון שחזור מצב אוטומטי בעת פתיחת הפופאפ
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      chrome.storage.local.get(['lastAnalysisState'], (store) => {
        const savedState = store.lastAnalysisState;
        if (savedState && savedState.url === activeTab.url) {
          tailoredResumeEnHtml = savedState.tailoredResumeEnHtml;
          tailoredResumeHeHtml = savedState.tailoredResumeHeHtml;
          currentJobData = savedState.currentJobData;

          output.innerHTML = `${savedState.analysisHtml}<h3>✉️ הודעת פנייה מוצעת למנהל/ת המגייס/ת:</h3>${savedState.outreachHtml}`;
          resultsDiv.style.display = 'block';
          if (downloadContainer) downloadContainer.style.display = 'flex';
          
          chrome.storage.local.get(['appliedJobs'], (appliedRes) => {
            const jobs = appliedRes.appliedJobs || [];
            const alreadyApplied = jobs.some(j => j.url === activeTab.url);
            if (markAppliedBtn) markAppliedBtn.style.display = alreadyApplied ? 'none' : 'block';
          });
        }
      });
    }
  } catch (stateErr) { console.error("Error restoring state:", stateErr); }

  // 2. טעינת קורות חיים מהאחסון
  if (cvTextArea) {
    chrome.storage.local.get(['userCV'], (result) => {
      if (result.userCV) cvTextArea.value = result.userCV;
      else { cvTextArea.value = defaultCV; chrome.storage.local.set({ userCV: defaultCV }); }
    });
  }

  // 3. מנגנון העלאת קבצים (PDF/TXT)
  if (uploadBtn && cvFileInput && cvTextArea) {
    uploadBtn.addEventListener('click', () => cvFileInput.click());
    cvFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = function(evt) { cvTextArea.value = evt.target.result; };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        cvTextArea.value = "...מחלץ טקסט מקובץ ה-PDF שלך באמצעות ה-AI, אנא המתן...";
        const reader = new FileReader();
        reader.onload = async function(evt) {
          try {
            const base64Data = evt.target.result.split(',')[1];
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ inlineData: { mimeType: "application/pdf", data: base64Data } }, { text: "Extract text from this PDF." }] }]
              })
            });
            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content.parts[0]) cvTextArea.value = data.candidates[0].content.parts[0].text;
          } catch (err) { cvTextArea.value = "שגיאה בחילוץ ה-PDF: " + err.message; }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 4. שמירת קורות חיים
  if (saveCvBtn && cvTextArea) {
    saveCvBtn.addEventListener('click', () => {
      chrome.storage.local.set({ userCV: cvTextArea.value }, () => {
        if (saveStatus) { saveStatus.style.display = 'block'; setTimeout(() => { saveStatus.style.display = 'none'; }, 2000); }
      });
    });
  }

  // 5. כפתורי הורדת DOCX מעוצב
  if (downloadEnBtn) downloadEnBtn.addEventListener('click', () => downloadDocxFile(tailoredResumeEnHtml, false));
  if (downloadHeBtn) downloadHeBtn.addEventListener('click', () => downloadDocxFile(tailoredResumeHeHtml, true));

  // --- 🌐 טאב 2: חיפוש גלובלי ברשת ---
  if (globalSearchBtn) {
    globalSearchBtn.addEventListener('click', async () => {
      const globalResultsDiv = document.getElementById('global-results-div');
      const globalOutput = document.getElementById('global-output');

      if (globalOutput && globalResultsDiv) {
        globalOutput.innerHTML = "<p style='font-size:12px; color:#64748b; text-align:center; margin:0; font-weight:bold;'>🌐 סורק כעת משרות פעילות באזור המגורים שלך מ-3 הימים האחרונים (התאמה >70%), אנא המתן...</p>";
        globalResultsDiv.style.display = 'block';
      }

      chrome.storage.local.get(['userCV', 'appliedJobs'], async (res) => {
        const cv = res.userCV || defaultCV;
        const appliedJobs = res.appliedJobs || [];

        const foundJobs = await searchGlobalJobsViaAI(cv);

        if (!globalOutput) return;

        if (foundJobs.length > 0 && foundJobs[0].isError) {
          globalOutput.innerHTML = `<p style='color:#ef4444; font-weight:bold; margin:0; text-align:center;'>שגיאת גוגל: ${foundJobs[0].errorMsg}</p>`;
          return;
        }

        if (foundJobs.length > 0) {
          renderJobCardsToContainer(foundJobs, appliedJobs, globalOutput);
        } else {
          globalOutput.innerHTML = "<p style='font-size:12px; color:#ef4444; text-align:center; margin:0;'>לא נמצאו משרות חדשות במיקום שלך מ-3 הימים האחרונים עם התאמה מעל 70%.</p>";
        }
      });
    });
  }

  // --- מנגנון מעקב הגשות ---
  if (markAppliedBtn) {
    markAppliedBtn.addEventListener('click', () => {
      if (!currentJobData) return;
      chrome.storage.local.get(['appliedJobs'], (result) => {
        const jobs = result.appliedJobs || [];
        if (jobs.some(j => j.url === currentJobData.url)) return alert("משרה זו כבר קיימת בלוח המעקב!");
        jobs.push({ title: currentJobData.title, company: currentJobData.company, score: currentJobData.score, date: new Date().toLocaleDateString('he-IL'), status: 'Applied', url: currentJobData.url });
        chrome.storage.local.set({ appliedJobs: jobs }, () => {
          if (appliedStatus) { appliedStatus.style.display = 'block'; setTimeout(() => { appliedStatus.style.display = 'none'; }, 3000); }
          markAppliedBtn.style.display = 'none';
        });
      });
    });
  }

  function renderTrackerList() {
    const trackerList = document.getElementById('tracker-list');
    if (!trackerList) return;
    chrome.storage.local.get(['appliedJobs'], (result) => {
      const jobs = result.appliedJobs || [];
      if (jobs.length === 0) { trackerList.innerHTML = `<p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px;">אין עדיין משרות במעקב.</p>`; return; }
      trackerList.innerHTML = jobs.map((job, idx) => `
        <div class="job-card" style="font-size:12px;">
          <strong>${job.title}</strong> (${job.score})<br><small>${job.company} | ${job.date}</small>
          <div style="margin-top:6px; display:flex; justify-content:space-between;">
            <select class="status-select" data-index="${idx}">
              <option value="Applied" ${job.status === 'Applied' ? 'selected' : ''}>הוגש</option>
              <option value="Interviewing" ${job.status === 'Interviewing' ? 'selected' : ''}>ראיונות</option>
              <option value="Technical Test" ${job.status === 'Technical Test' ? 'selected' : ''}>מטלה טכנית</option>
              <option value="Offered" ${job.status === 'Offered' ? 'selected' : ''}>הצעה</option>
              <option value="Rejected" ${job.status === 'Rejected' ? 'selected' : ''}>לא רלוונטי</option>
            </select>
            <button class="delete-job-btn" data-index="${idx}" style="color:red; background:none; border:none; cursor:pointer;">מחק</button>
          </div>
        </div>
      `).join('');
      document.querySelectorAll('.status-select').forEach(sel => sel.addEventListener('change', (e) => updateJobStatus(parseInt(e.target.getAttribute('data-index')), e.target.value)));
      document.querySelectorAll('.delete-job-btn').forEach(b => b.addEventListener('click', (e) => deleteJob(parseInt(e.target.getAttribute('data-index')))));
    });
  }
  function updateJobStatus(index, newStatus) { chrome.storage.local.get(['appliedJobs'], (res) => { const jobs = res.appliedJobs || []; if(jobs[index]) { jobs[index].status = newStatus; chrome.storage.local.set({ appliedJobs: jobs }); } }); }
  function deleteJob(index) { chrome.storage.local.get(['appliedJobs'], (res) => { const jobs = res.appliedJobs || []; jobs.splice(index, 1); chrome.storage.local.set({ appliedJobs: jobs }, renderTrackerList); }); }
  if (clearTrackerBtn) { clearTrackerBtn.addEventListener('click', () => { if(confirm("למחוק הכל?")) chrome.storage.local.set({ appliedJobs: [] }, renderTrackerList); }); }

  // --- טאב מעקב חברות ---
  function loadCompanies() {
    chrome.storage.local.get(['watchedCompanies'], (result) => {
      watchedCompanies = result.watchedCompanies || [];
      renderCompanyList();
    });
  }

  if (addCompanyBtn) {
    addCompanyBtn.addEventListener('click', () => {
      const name = document.getElementById('comp-name').value.trim();
      if (!name) return alert("נא להזין שם חברה.");
      watchedCompanies.push({ name });
      chrome.storage.local.set({ watchedCompanies }, () => { document.getElementById('comp-name').value = ''; renderCompanyList(); });
    });
  }

  function renderCompanyList() {
    const listDiv = document.getElementById('company-list');
    if (!listDiv) return;
    if (watchedCompanies.length === 0) { listDiv.innerHTML = `<p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 10px;">אין חברות ברשימה.</p>`; return; }
    listDiv.innerHTML = watchedCompanies.map((c, i) => `
      <div style="font-size:12px; padding:6px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:600; color:#334155;">🏢 ${c.name}</span>
        <button class="remove-comp-btn" data-index="${i}" style="color:#ef4444; border:none; background:none; cursor:pointer; font-weight:bold;">✕</button>
      </div>
    `).join('');
    document.querySelectorAll('.remove-comp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        watchedCompanies.splice(idx, 1);
        chrome.storage.local.set({ watchedCompanies }, renderCompanyList);
      });
    });
  }

  if (scanAllBtn) {
    scanAllBtn.addEventListener('click', async () => {
      const compResultsDiv = document.getElementById('companies-results-div');
      const compOutput = document.getElementById('companies-output');
      chrome.storage.local.get(['userCV', 'watchedCompanies', 'appliedJobs'], async (res) => {
        const cv = res.userCV || defaultCV;
        const companies = res.watchedCompanies || [];
        const appliedJobs = res.appliedJobs || [];

        if (companies.length === 0) { if (compOutput) { compOutput.textContent = "שגיאה: רשימת החברות שלך ריקה."; compResultsDiv.style.display = 'block'; } return; }

        let allMatches = [];
        for (const company of companies) {
          if (compOutput && compResultsDiv) {
            compOutput.innerHTML = `<p style='font-size:12px; color:#4f46e5; text-align:center; margin:0; font-weight:bold;'>🔍 סורק כעת משרות עבור: ${company.name}...</p>`;
            compResultsDiv.style.display = 'block';
          }
          const parsed = await searchOpenJobsViaGoogleSearchAI(company.name, cv);
          if (Array.isArray(parsed)) allMatches.push(...parsed);
        }

        if (!compOutput) return;
        const apiError = allMatches.find(m => m.isError);
        if (apiError) { compOutput.innerHTML = `<p style='color:#ef4444; font-weight:bold; margin:0; text-align:center;'>שגיאת מערכת מגוגל: ${apiError.errorMsg}</p>`; return; }

        if (allMatches.length > 0) {
          renderJobCardsToContainer(allMatches, appliedJobs, compOutput);
        } else { compOutput.innerHTML = "<p style='font-size:12px; color:#ef4444; text-align:center; margin:0;'>לא נמצאו משרות פתוחות כרגע עבור החברות שברשימה.</p>"; }
      });
    });
  }

  // המלצות חברות
  if (getSuggestionsBtn && suggestionsList) {
    getSuggestionsBtn.addEventListener('click', () => {
      suggestionsList.innerHTML = "<p style='font-size:11px; color:#64748b; text-align:center;'>מחפש חברות יעד מתאימות...</p>";
      chrome.storage.local.get(['userCV', 'watchedCompanies'], async (res) => {
        const cv = res.userCV || defaultCV;
        const companies = res.watchedCompanies || [];
        const companyNames = companies.map(c => c.name).join(', ');

        try {
          const recommendationPrompt = `Recommend 3-4 tech/enterprise companies matching CV: "${cv}" and Targets: "${companyNames}". Output a strict JSON array of objects with keys: "name", "reason" (in Hebrew), "career_url". No markdown wraps.`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: recommendationPrompt }] }] })
          });
          const data = await response.json();
          let rawJsonText = data.candidates[0].content.parts[0].text.trim();
          const startIdx = rawJsonText.indexOf('['); const endIdx = rawJsonText.lastIndexOf(']');
          if (startIdx !== -1 && endIdx !== -1) rawJsonText = rawJsonText.substring(startIdx, endIdx + 1);
          
          const suggestions = JSON.parse(rawJsonText);
          suggestionsList.innerHTML = suggestions.map((s) => `
            <div class="job-card" style="background:#ffffff; border:1px dashed #cbd5e1; padding:10px; margin-bottom:6px; border-radius:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size:12px; color:#4f46e5;">${s.name}</strong>
                <button class="add-suggested-btn" data-name="${s.name}" style="background:#10b981; color:white; border:none; border-radius:4px; padding:3px 8px; font-size:10.5px; cursor:pointer; font-weight:bold;">+ הוסף</button>
              </div>
              <p style="font-size:11px; color:#475569; margin:4px 0 0 0; line-height:1.4;">${s.reason}</p>
            </div>
          `).join('');

          document.querySelectorAll('.add-suggested-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const name = e.target.getAttribute('data-name'); watchedCompanies.push({ name });
              chrome.storage.local.set({ watchedCompanies }, () => { renderCompanyList(); e.target.disabled = true; e.target.style.background = '#cbd5e1'; e.target.textContent = 'נוסף ✓'; });
            });
          });
        } catch (err) { suggestionsList.innerHTML = "<p style='font-size:11px; color:#ef4444; text-align:center;'>שגיאה בהפקת המלצות.</p>"; }
      });
    });
  }

  // --- 🎯 טאב 1: ניתוח משרה במודל "מנהל מגייס" ---
  if (analyzeBtn && output && resultsDiv) {
    analyzeBtn.addEventListener('click', async () => {
      output.textContent = "מנהל המגייס מנתח את המשרה ומעריך את קורות החיים...";
      resultsDiv.style.display = 'block';
      if (downloadContainer) downloadContainer.style.display = 'none';
      if (markAppliedBtn) markAppliedBtn.style.display = 'none';

      try {
        chrome.storage.local.get(['userCV'], async (result) => {
          const activeCV = result.userCV || defaultCV;
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) { output.textContent = "שגיאה: לא נמצא טאב פעיל."; return; }

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
          }, async (scriptResults) => {
            try {
              if (!scriptResults || !scriptResults[0]) throw new Error("לא הצלחנו לקרוא את הטקסט מהעמוד.");
              const pageText = scriptResults[0].result;

              const promptText = `
              You are an experienced Hiring Manager and Senior Technical Director evaluating a candidate for a role in your team.
              Critically review the Candidate's Resume against the Target Job Description with a realistic, high-bar business mindset.

              CANDIDATE RESUME:
              ${activeCV}

              TARGET JOB DESCRIPTION:
              ${pageText}

              🧠 HIRING MANAGER EVALUATION DIRECTIVES:
              1. 🛑 SENIORITY CAP: If Job requires 5+ YOE or Senior/Lead/Manager, and Candidate has under 4 YOE, CAP match_score strictly at 35%-48%.
              2. 🎯 BUSINESS IMPACT: Shift from task listing to business ROI ([Action Verb] + [Tool] + [Impact]).
              3. 🔍 GAPS: Highlight non-negotiable tech stack missing.
              4. ✍️ STRICT RESUME HTML STRUCTURE MANDATE:
                 - Use ONLY clean, semantic block elements: <h1> for Candidate Name, <p> for Contact info, <h2> for Section Titles, <h3> for Job Titles/Companies, <p> for paragraphs, and <ul>/<li> for bullet lists.
                 - NEVER wrap the entire resume in a single big <div> or single paragraph.
                 - Use SINGLE QUOTES (') inside HTML attribute strings.

              Output a strictly valid JSON object ONLY.
              Schema: {"job_title":"title","company_name":"company","match_score":"45%","analysis_html":"Hebrew analysis","outreach_html":"LinkedIn msg","tailored_resume_en_html":"HTML English CV","tailored_resume_he_html":"HTML Hebrew CV"}
              `;

              const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
              });
              
              const data = await response.json();
              if (data.error) throw new Error(`שגיאת גוגל (${data.error.code}): ${data.error.message}`);

              if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                let raw = data.candidates[0].content.parts[0].text.trim();
                const startIdx = raw.indexOf('{'); const endIdx = raw.lastIndexOf('}');
                if (startIdx !== -1 && endIdx !== -1) { raw = raw.substring(startIdx, endIdx + 1); }
                
                const resData = JSON.parse(raw);
                tailoredResumeEnHtml = resData.tailored_resume_en_html;
                tailoredResumeHeHtml = resData.tailored_resume_he_html;
                currentJobData = { title: resData.job_title, company: resData.company_name, score: resData.match_score, url: tab.url };

                output.innerHTML = `${resData.analysis_html}<h3>✉️ הודעת פנייה מוצעת למנהל/ת המגייס/ת:</h3>${resData.outreach_html}`;
                if (downloadContainer) downloadContainer.style.display = 'flex';
                if (markAppliedBtn) markAppliedBtn.style.display = 'block';

                const stateToSave = {
                  url: tab.url,
                  analysisHtml: resData.analysis_html,
                  outreachHtml: resData.outreach_html,
                  tailoredResumeEnHtml: tailoredResumeEnHtml,
                  tailoredResumeHeHtml: tailoredResumeHeHtml,
                  currentJobData: currentJobData
                };
                chrome.storage.local.set({ lastAnalysisState: stateToSave });
              }
            } catch (innerError) { output.innerHTML = `<span style='color:#ef4444; font-weight:bold;'>שגיאה בניתוח:</span> ${innerError.message}`; }
          });
        });
      } catch (outerError) { output.innerHTML = `<span style='color:#ef4444; font-weight:bold;'>שגיאה כללית:</span> ${outerError.message}`; }
    });
  }
});

// =========================================================================
// 🏢 מנוע יצירת קובצי DOCX נטיביים ומעוצבים (Strict OpenXML Engine V2)
// =========================================================================

function downloadDocxFile(htmlContent, isHebrew, filename) {
  const defaultFilename = isHebrew ? 'Resume_Hebrew_Tailored.docx' : 'Resume_English_Tailored.docx';
  let finalFilename = filename || defaultFilename;
  if (!finalFilename.endsWith('.docx')) {
    finalFilename = finalFilename.replace(/\.[^/.]+$/, '') + '.docx';
  }

  const docXml = convertHtmlToWordXml(htmlContent, isHebrew);

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

  const files = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: 'word/_rels/document.xml.rels', content: docRelsXml },
    { name: 'word/document.xml', content: docXml },
    { name: 'word/styles.xml', content: stylesXml }
  ];

  const docxBlob = buildZipArchive(files);
  const url = URL.createObjectURL(docxBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function makeRPr(fontName, options = {}) {
  let xml = "<w:rPr>";
  xml += `<w:rFonts w:ascii="${fontName}" w:hAnsi="${fontName}" w:cs="${fontName}"/>`;
  if (options.bold) {
    xml += "<w:b/><w:bCs/>";
  }
  if (options.color) {
    xml += `<w:color w:val="${options.color.replace('#', '')}"/>`;
  }
  if (options.size) {
    xml += `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>`;
  }
  if (options.isHebrew) {
    xml += "<w:rtl/>";
  }
  xml += "</w:rPr>";
  return xml;
}

function makePPr(options = {}) {
  let xml = "<w:pPr>";
  if (options.pBdr) {
    xml += options.pBdr;
  }
  if (options.jc) {
    xml += `<w:jc w:val="${options.jc}"/>`;
  }
  if (options.indLeft || options.indHanging) {
    const left = options.indLeft || 0;
    const hanging = options.indHanging || 0;
    xml += `<w:ind w:left="${left}" w:hanging="${hanging}"/>`;
  }
  const sBefore = options.spaceBefore !== undefined ? options.spaceBefore : 40;
  const sAfter = options.spaceAfter !== undefined ? options.spaceAfter : 100;
  const lSpace = options.lineSpace || 276;
  xml += `<w:spacing w:before="${sBefore}" w:after="${sAfter}" w:line="${lSpace}" w:lineRule="auto"/>`;
  if (options.isHebrew) {
    xml += "<w:bidi/>";
  }
  xml += "</w:pPr>";
  return xml;
}

// 🎨 המרת HTML מבוססת סריקת בלוקים מפורשת (מניעת דחיסת פסקאות ושימור רווחים)
function convertHtmlToWordXml(htmlContent, isHebrew) {
  function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  let xmlParagraphs = "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
  const fontName = isHebrew ? 'Arial' : 'Calibri';

  function processBlock(element, tag) {
    let pRuns = "";

    function collectRuns(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent;
        if (txt) {
          let isBold = ['h1', 'h2', 'h3'].includes(tag);
          let curr = node.parentNode;
          while (curr && curr !== element) {
            if (curr.nodeType === Node.ELEMENT_NODE && ['b', 'strong'].includes(curr.tagName.toLowerCase())) {
              isBold = true;
              break;
            }
            curr = curr.parentNode;
          }

          let sz = 21;
          let color = '2D3748';
          if (tag === 'h1') { sz = 38; color = '1A365D'; }
          else if (tag === 'h2') { sz = 24; color = '1A365D'; }
          else if (tag === 'h3') { sz = 22; color = '2D3748'; }
          else if (tag === 'li') { sz = 20; color = '2D3748'; }

          const rPr = makeRPr(fontName, { bold: isBold, size: sz, color, isHebrew });
          pRuns += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(txt)}</w:t></w:r>`;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const childTag = node.tagName.toLowerCase();
        if (childTag === 'br') {
          pRuns += `<w:r><w:br/></w:r>`;
        } else {
          node.childNodes.forEach(collectRuns);
        }
      }
    }

    element.childNodes.forEach(collectRuns);

    if (!pRuns) return;

    let pPr = "";
    if (tag === 'h1') {
      pPr = makePPr({ jc: 'center', spaceBefore: 80, spaceAfter: 140, isHebrew });
    } else if (tag === 'h2') {
      const borderXml = '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="6" w:color="1A365D"/></w:pBdr>';
      pPr = makePPr({ pBdr: borderXml, spaceBefore: 280, spaceAfter: 120, isHebrew });
    } else if (tag === 'h3') {
      pPr = makePPr({ spaceBefore: 160, spaceAfter: 60, isHebrew });
    } else if (tag === 'li') {
      pPr = makePPr({ indLeft: 360, indHanging: 180, spaceBefore: 40, spaceAfter: 60, lineSpace: 260, isHebrew });
      const bulletRPr = makeRPr(fontName, { bold: true, color: '1A365D', size: 20, isHebrew });
      pRuns = `<w:r>${bulletRPr}<w:t xml:space="preserve">• </w:t></w:r>` + pRuns;
    } else {
      pPr = makePPr({ spaceBefore: 40, spaceAfter: 100, isHebrew });
    }

    xmlParagraphs += `<w:p>${pPr}${pRuns}</w:p>`;
  }

  function walkDom(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'p', 'li'].includes(tag)) {
        processBlock(node, tag);
      } else {
        node.childNodes.forEach(walkDom);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.textContent.trim();
      if (txt) {
        const pPr = makePPr({ spaceBefore: 40, spaceAfter: 100, isHebrew });
        const rPr = makeRPr(fontName, { size: 21, color: '2D3748', isHebrew });
        xmlParagraphs += `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(txt)}</w:t></w:r></w:p>`;
      }
    }
  }

  doc.body.childNodes.forEach(walkDom);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${xmlParagraphs}
    <w:sectPr>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// בונה ארכיב ZIP תקני של OpenXML
function buildZipArchive(files) {
  const encoder = new TextEncoder();
  const fileHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  function getCrc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  files.forEach(file => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = getCrc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    fileHeaders.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(centralHeader.buffer);
    cView.setUint32(0, 0x02014b50, true);
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0, true);
    cView.setUint16(10, 0, true);
    cView.setUint16(12, 0, true);
    cView.setUint16(14, 0, true);
    cView.setUint32(16, crc, true);
    cView.setUint32(20, size, true);
    cView.setUint32(24, size, true);
    cView.setUint16(28, nameBytes.length, true);
    cView.setUint16(30, 0, true);
    cView.setUint16(32, 0, true);
    cView.setUint16(34, 0, true);
    cView.setUint16(36, 0, true);
    cView.setUint32(38, 0, true);
    cView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  });

  const centralDirOffset = offset;
  let centralDirSize = 0;
  centralHeaders.forEach(ch => centralDirSize += ch.length);

  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true);
  eView.setUint16(4, 0, true);
  eView.setUint16(6, 0, true);
  eView.setUint16(8, files.length, true);
  eView.setUint16(10, files.length, true);
  eView.setUint32(12, centralDirSize, true);
  eView.setUint32(16, centralDirOffset, true);
  eView.setUint16(20, 0, true);

  const allParts = [...fileHeaders, ...centralHeaders, eocd];
  let totalLength = 0;
  allParts.forEach(p => totalLength += p.length);

  const zipBytes = new Uint8Array(totalLength);
  let pos = 0;
  allParts.forEach(p => {
    zipBytes.set(p, pos);
    pos += p.length;
  });

  return new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// פונקציית עזר לרינדור כרטיסיות משרות בצורה אחידה
function renderJobCardsToContainer(jobList, appliedJobs, containerElement) {
  containerElement.innerHTML = `<h4 style="margin:0 0 8px 0; color:#10b981; font-size:12.5px;">🔥 משרות שנמצאו ברשת:</h4>` + jobList.map((m) => {
    const isApplied = appliedJobs.some(j => j.url === m.url);
    const safeTitle = m.title.replace(/"/g, '&quot;');
    const safeCompany = m.company.replace(/"/g, '&quot;');

    return `
    <div class="job-card" style="text-align:right; border-right: 4px solid #10b981; padding:10px; background:#f8fafc; margin-bottom:10px; border-radius:6px; border:1px solid #e2e8f0; border-right: 4px solid #10b981;">
      <strong style="font-size:12px; color:#1f2937;">${m.title}</strong> <span style="color:#10b981; font-weight:bold; font-size:11px;">(${m.score})</span><br>
      <small style="color:#64748b;">חברה: ${m.company}</small><br>
      
      <a href="${m.url}" target="_blank" class="auto-apply-link" data-title="${safeTitle}" data-company="${safeCompany}" data-score="${m.score}" data-url="${m.url}" style="font-size:11px; color:#2563eb; text-decoration:none; font-weight:bold; display:inline-block; margin-top:6px; margin-bottom:8px;">
        🔗 מעבר לעמוד הגשת המועמדות (שומר למעקב)
      </a>
      
      <div style="display:flex; gap:6px; margin-bottom:6px;">
        <button class="card-cv-en-btn primary-btn" data-title="${safeTitle}" data-company="${safeCompany}" style="background-color:#2563eb; font-size:10.5px; padding:6px 4px; flex:1;">
          📝 קו"ח באנגלית
        </button>
        <button class="card-cv-he-btn primary-btn" data-title="${safeTitle}" data-company="${safeCompany}" style="background-color:#0d9488; font-size:10.5px; padding:6px 4px; flex:1;">
          📝 קו"ח בעברית
        </button>
      </div>

      <button class="card-mark-applied-btn primary-btn" data-title="${safeTitle}" data-company="${safeCompany}" data-score="${m.score}" data-url="${m.url}" ${isApplied ? 'disabled style="background-color:#94a3b8; font-size:11px; padding:6px; width:100%;"' : 'style="background-color:#f59e0b; font-size:11px; padding:6px; width:100%;"'}>
        ${isApplied ? 'הוגש ונוסף למעקב ✓' : '✅ הגשתי מועמדות! (שמור למעקב)'}
      </button>
    </div>
  `}).join('');

  containerElement.querySelectorAll('.auto-apply-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const title = e.currentTarget.getAttribute('data-title');
      const company = e.currentTarget.getAttribute('data-company');
      const score = e.currentTarget.getAttribute('data-score');
      const url = e.currentTarget.getAttribute('data-url');

      chrome.storage.local.get(['appliedJobs'], (result) => {
        const jobs = result.appliedJobs || [];
        if (!jobs.some(j => j.url === url)) {
          jobs.push({ title, company, score, date: new Date().toLocaleDateString('he-IL'), status: 'Applied', url });
          chrome.storage.local.set({ appliedJobs: jobs });
        }
      });
    });
  });

  containerElement.querySelectorAll('.card-cv-en-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = e.target.getAttribute('data-title');
      const company = e.target.getAttribute('data-company');
      generateAndDownloadTailoredCv(title, company, false, e.target);
    });
  });

  containerElement.querySelectorAll('.card-cv-he-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = e.target.getAttribute('data-title');
      const company = e.target.getAttribute('data-company');
      generateAndDownloadTailoredCv(title, company, true, e.target);
    });
  });

  containerElement.querySelectorAll('.card-mark-applied-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = e.target.getAttribute('data-title');
      const company = e.target.getAttribute('data-company');
      const score = e.target.getAttribute('data-score');
      const url = e.target.getAttribute('data-url');

      chrome.storage.local.get(['appliedJobs'], (result) => {
        const jobs = result.appliedJobs || [];
        if (jobs.some(j => j.url === url)) { alert("משרה זו כבר קיימת בלוח המעקב!"); return; }
        jobs.push({ title, company, score, date: new Date().toLocaleDateString('he-IL'), status: 'Applied', url });
        chrome.storage.local.set({ appliedJobs: jobs }, () => {
          e.target.style.backgroundColor = '#94a3b8';
          e.target.textContent = 'הוגש ונוסף למעקב ✓';
          e.target.disabled = true;
        });
      });
    });
  });
}

// 🟢 מנוע חיפוש גלובלי
async function searchGlobalJobsViaAI(cv) {
  try {
    const prompt = `You are an autonomous AI recruitment agent with live web search capabilities.
    Search the live internet right now to find actively open job vacancies for Data Analyst, BI Developer, System Integrator, SQL/ETL Specialist, or Data Control roles.

    CANDIDATE PROFILE & LOCATION DATA:
    ${cv}

    🛑 CRITICAL MANDATES FOR GLOBAL SEARCH & REAL URL INTEGRITY:
    1. REAL URL MANDATE: NEVER guess, fabricate, or reconstruct URLs. Output direct verified links from Comeet, Greenhouse, Lever, Workday, LinkedIn Israel, Drushim, or AllJobs.
       - If missing, generate Google Search URL: 'https://www.google.com/search?q=[Company]+[Title]+careers'
    2. STRICT LOCATION MANDATE: Extract candidate location from CV (e.g. Tel Aviv / Central Israel). Exclude roles physically outside Israel.
    3. FRESHNESS MANDATE: Find ONLY jobs posted within the LAST 3 DAYS (72 hours).
    4. SCORE THRESHOLD: Return ONLY positions with match score >= 70%.
    5. SENIORITY GATEKEEPER: EXCLUDE 5+ YOE, Senior, Lead, Manager, or Principal roles.

    Format each matching open job exactly like this line layout (NO markdown, NO backticks, NO extra text):
    TITLE: [Job Title] | COMPANY: [Company Name] | SCORE: [Score %] | URL: [Active Verified Link]

    If no matching fresh roles are found, reply with ONLY the word: NONE`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
    });

    const data = await response.json();
    if (data.error) return [{ isError: true, errorMsg: data.error.message }];
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) return [];

    const rawText = data.candidates[0].content.parts[0].text.trim();
    if (rawText.toUpperCase().includes("NONE") || rawText === "") return [];

    const lines = rawText.split('\n');
    const jobs = [];
    for (const line of lines) {
      if (line.includes('|') && line.includes('TITLE:')) {
        try {
          const parts = line.split('|');
          const title = parts[0].replace('TITLE:', '').trim();
          const company = parts[1].replace('COMPANY:', '').trim();
          const score = parts[2].replace('SCORE:', '').trim();
          const url = parts[3].replace('URL:', '').trim();
          if (title && url && url !== '#') jobs.push({ title, company, score, url });
        } catch (e) { console.error("Line parse error", e); }
      }
    }
    return jobs;
  } catch (e) {
    console.error("Error in global job search", e);
    return [];
  }
}

// 🟢 יצירת קו"ח בפורמט DOCX מותאם מכרטיסיית משרה
async function generateAndDownloadTailoredCv(jobTitle, companyName, isHebrew, btnElement) {
  const originalText = btnElement.textContent;
  btnElement.textContent = "מכין קו\"ח... ⏳";
  btnElement.disabled = true;

  try {
    const result = await new Promise(resolve => chrome.storage.local.get(['userCV'], resolve));
    const activeCV = result.userCV || defaultCV;

    const lang = isHebrew ? "HEBREW" : "ENGLISH";
    const promptText = `
    You are an elite career advisor and ATS optimizer.
    Rewrite the Candidate's Resume specifically optimized for the job role: '${jobTitle}' at company: '${companyName}'.
    Language MUST be ${lang}.
    
    Candidate's Resume:
    ${activeCV}
    
    STRICT REWRITING RULES:
    1. NO FABRICATION: Keep experience 100% truthful.
    2. Frame candidate's data analysis, BI, SQL, Power Query, VBA, and system integration skills to directly highlight relevance.
    3. Use SINGLE QUOTES (') for all HTML element attributes.
    4. STRICT RESUME HTML STRUCTURE MANDATE:
       - Output ONLY clean semantic HTML block elements: <h1> for Candidate Name, <p> for Contact line, <h2> for Section Titles, <h3> for Job Titles, <p> for descriptions, and <ul>/<li> for bullet points.
       - Do NOT wrap in markdown code blocks (\`\`\`html).
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      let cvHtml = data.candidates[0].content.parts[0].text.trim();
      if (cvHtml.startsWith("```")) cvHtml = cvHtml.replace(/^```html/, "").replace(/^```/, "").replace(/```$/, "").trim();
      
      const cleanTitle = jobTitle.replace(/[^a-zA-Z0-9א-ת]/g, '_');
      const filename = isHebrew ? `Resume_Hebrew_${cleanTitle}.docx` : `Resume_English_${cleanTitle}.docx`;
      
      downloadDocxFile(cvHtml, isHebrew, filename);
    } else { throw new Error("לא התקבלה תשובה תקינה מה-AI"); }
  } catch (err) {
    console.error("Error generating CV:", err);
    alert("שגיאה ביצירת קורות החיים: " + err.message);
  } finally {
    btnElement.textContent = originalText;
    btnElement.disabled = false;
  }
}

// 🟢 סריקת משרות עבור חברות ספציפיות
async function searchOpenJobsViaGoogleSearchAI(companyName, cv) {
  try {
    const prompt = `You are a recruitment assistant with live web search capabilities.
    Search the live internet right now to find actively open job vacancies at '${companyName}' matching this candidate profile: "${cv}".
    
    🛑 STRICT REAL URL & SENIORITY FILTERING:
    - NEVER hallucinate URLs. Output only real direct URLs from Comeet, Greenhouse, Lever, LinkedIn, or official career portals.
    - If a direct link is missing, construct a Google Search URL: 'https://www.google.com/search?q=${companyName}+data+careers'
    - Exclude 5+ YOE, Senior, Lead, Manager roles, and roles outside Israel.
    
    Format each valid job exactly like this line layout (NO markdown, NO code blocks):
    TITLE: [Job Title] | COMPANY: ${companyName} | SCORE: [Score %] | URL: [Active Verified Link]
    
    If no matching roles are found, reply with ONLY the word: NONE`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
    });
    
    const data = await response.json();
    if (data.error) return [{ isError: true, errorMsg: data.error.message }];
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) return [];
    
    const rawText = data.candidates[0].content.parts[0].text.trim();
    if (rawText.toUpperCase().includes("NONE") || rawText === "") return [];
    
    const lines = rawText.split('\n');
    const jobs = [];
    for (const line of lines) {
      if (line.includes('|') && line.includes('TITLE:')) {
        try {
          const parts = line.split('|');
          const title = parts[0].replace('TITLE:', '').trim();
          const company = parts[1].replace('COMPANY:', '').trim();
          const score = parts[2].replace('SCORE:', '').trim();
          const url = parts[3].replace('URL:', '').trim();
          if (title && url && url !== '#') jobs.push({ title, company, score, url });
        } catch (e) { console.error("Line parse error", e); }
      }
    }
    return jobs;
  } catch (e) { console.error("Error in live search", e); return []; }
}