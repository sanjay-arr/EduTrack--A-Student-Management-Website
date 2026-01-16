// --- 1. CONFIGURATION ---
const PROJECT_URL = 'https://idvyaihmztjzaqwrnhgh.supabase.co'; 
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdnlhaWhtenRqemFxd3JuaGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTMyNzIsImV4cCI6MjA4Mzk4OTI3Mn0.AwVzQ_-wZRqy5HBGoCPeGqGkScCVDGW2KIHfkpJtGno';

let dbClient = null;
let isLoginMode = true;
let currentUserId = null; 

if (typeof supabase !== 'undefined') {
    dbClient = supabase.createClient(PROJECT_URL, API_KEY);
} else {
    console.error("Supabase not loaded");
}

document.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    
    if(dbClient) {
        // 🔴 CRITICAL UPDATE: Handle Password Recovery Event
        dbClient.auth.onAuthStateChange((event, session) => {
            console.log("Auth Event:", event);

            if (event === 'PASSWORD_RECOVERY') {
                // User clicked the email link. Show the "Set New Password" modal.
                document.getElementById('reset-overlay').style.display = 'flex';
            } 
            else if (event === 'SIGNED_IN') {
                if(session) {
                    currentUserId = session.user.id;
                    updateUI(session);
                    loadRealTimeData();
                }
            } 
            else if (event === 'SIGNED_OUT') {
                // 1. Clear tracking variable
                currentUserId = null;
                
                // 2. Show the Login Overlay manually
                document.getElementById('auth-overlay').style.display = 'flex';
                
                // 3. Ensure it is on the "Login" card
                switchView('login');
                
                // 4. (Optional) Clear sensitive dashboard data
                document.getElementById('dash-cgpa').innerText = "0.00";
            }
        });

        // Initial Session Check
        const { data: { session } } = await dbClient.auth.getSession();
        if (session) {
            currentUserId = session.user.id;
            updateUI(session);
            loadRealTimeData();
        }
    }
    
    loadData();
    loadBacklogs();
    initChart();
    addResumeProject();
});

// 🔴 NEW: FUNCTION TO ACTUALLY UPDATE THE PASSWORD
async function finalizePasswordReset() {
    const newPassword = document.getElementById('new-password-input').value;
    
    if (!newPassword || newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    const { data, error } = await dbClient.auth.updateUser({ 
        password: newPassword 
    });

    if (error) {
        alert("Error updating password: " + error.message);
    } else {
        alert("Success! Your password has been changed. You are now logged in.");
        document.getElementById('reset-overlay').style.display = 'none'; // Hide modal
        window.location.hash = ''; // Clear URL hash
    }
}

// WRAPPER TO LOAD CLOUD DATA
async function loadRealTimeData() {
    await loadAttendance(); 
    await loadDeadlines();
}

// --- 2. NAVIGATION ---
function showSection(id, el) {
    document.querySelectorAll('.view').forEach(d => d.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    if(el) el.classList.add('active');
    
    const names = {
        'dashboard': 'Dashboard Overview',
        'gpa-calc': 'GPA Calculator',
        'cgpa-calc': 'CGPA Calculator',
        'attendance': 'Attendance Tracker',
        'resume': 'Resume Builder',
        'backlogs': 'Backlog Management',
        'target': 'Target Predictor',
        'export': 'Export Reports',
        'deadlines': 'Deadline Tracker',
        'profile': 'Student Profile'
    };
    document.getElementById('page-title').innerText = names[id];
}

// --- 3. AUTHENTICATION ---
function updateUI(session) {
    document.getElementById('auth-overlay').style.display = session ? 'none' : 'flex';
}

async function handleAuthAction() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('auth-btn-text');
    const msg = document.getElementById('auth-message');
    
    if(!email || !password) {
        msg.innerText = "Please enter credentials";
        return;
    }
    btn.innerText = "Processing...";
    msg.innerText = "";
    
    if(isLoginMode) {
        const { error } = await dbClient.auth.signInWithPassword({ email, password });
        if(error) {
            msg.innerText = error.message;
            btn.innerText = "Secure Login";
        } else {
            location.reload();
        }
    } else {
        const { error } = await dbClient.auth.signUp({ email, password });
        if(error) {
            msg.innerText = error.message;
        } else {
            alert("Account Created! IMPORTANT: Please check your email to verify your account before logging in.");
            toggleAuthMode();
        }
        btn.innerText = isLoginMode ? "Secure Login" : "Create Account";
    }
}

// FORGOT PASSWORD REQUEST
async function handleForgotPassword() {
    const email = document.getElementById('email').value;
    const msg = document.getElementById('auth-message');
    
    if (!email) {
        alert("Please enter your email address in the box first.");
        return;
    }
    
    msg.innerText = "Sending reset link...";
    
    const { error } = await dbClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href, 
    });
    
    if (error) {
        msg.innerText = "Error: " + error.message;
        alert("Failed to send reset link. " + error.message);
    } else {
        msg.innerText = "Reset link sent to your email!";
        alert("Success! Check your email for the password reset link.");
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-btn-text').innerText = isLoginMode ? "Secure Login" : "Create Account";
    document.getElementById('auth-toggle-msg').innerText = isLoginMode ? "New User? Create Account" : "Back to Login";
    document.getElementById('auth-message').innerText = "";
}

// --- LOGOUT LOGIC (FIXED) ---
async function handleLogout() {
    // 1. Sign out from Supabase
    await dbClient.auth.signOut();
    
    // 2. Clear local tracking variable
    currentUserId = null;

    // 3. Force the Auth Overlay to show immediately
    document.getElementById('auth-overlay').style.display = 'flex';

    // 4. Ensure it shows the "Login" card (not forgot password or update)
    switchView('login');

    // 5. Optional: Clear sensitive data from screen
    document.getElementById('dash-cgpa').innerText = "0.00";
    document.getElementById('dash-gpa').innerText = "0.00";
    document.getElementById('dash-backlogs').innerText = "0";
}

// --- 4. GPA CALCULATOR ---
function addSubjectRow() {
    const div = document.createElement('div');
    div.className = 'input-group';
    div.innerHTML = `
        <input type="text" class="subject-input" placeholder="Subject Name (e.g. Maths)" style="flex: 3; min-width: 150px;">
        <input type="number" class="credit" placeholder="Credits" min="1" max="10" style="flex: 1;">
        <select class="grade" style="flex: 2;">
            <option value="" disabled selected>Grade</option>
            <option value="10">O (10)</option>
            <option value="9">A+ (9)</option>
            <option value="8">A (8)</option>
            <option value="7">B+ (7)</option>
            <option value="6">B (6)</option>
            <option value="5">C (5)</option>
            <option value="0">U/RA (0)</option>
        </select>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#ef4444; font-size:1.2rem; cursor:pointer; padding: 0 10px;">
            <i class="ri-close-circle-fill"></i>
        </button>
    `;
    document.getElementById('subject-rows').appendChild(div);
}

// --- GPA CALCULATOR (UPDATES DASHBOARD TOO) ---
function calculateGPA() {
    const rows = document.querySelectorAll('#subject-rows .input-group');
    let points = 0, credits = 0, subjectDetails = [];

    rows.forEach(r => {
        const sub = r.querySelector('.subject-input').value || "Subject";
        const cr = parseFloat(r.querySelector('.credit').value);
        const grVal = parseFloat(r.querySelector('.grade').value);
        const gradeSelect = r.querySelector('.grade');
        const grText = gradeSelect.selectedIndex >= 0 ? gradeSelect.options[gradeSelect.selectedIndex].text : "-";

        if(cr && !isNaN(grVal)) { 
            points += cr * grVal; 
            credits += cr; 
            subjectDetails.push([sub, cr, grText]);
        }
    });
    
    const res = credits ? (points / credits).toFixed(2) : "0.00";
    
    // Save for PDF
    localStorage.setItem('latestSubjects', JSON.stringify(subjectDetails)); 
    
    // Update Calculator Result
    document.getElementById('gpa-score').innerText = res;
    document.getElementById('gpa-result-box').style.display = 'block';

    // 🔴 NEW: Update Dashboard GPA
    const dashGpa = document.getElementById('dash-gpa');
    if(dashGpa) dashGpa.innerText = res;
}

// --- 5. CGPA CALCULATOR ---
function addSemesterRow(c='', g='') {
    const div = document.createElement('div');
    div.className = 'input-group semester-row';
    div.innerHTML = `
        <input type="number" class="sem-credit" placeholder="Credits" value="${c}">
        <input type="number" class="sem-gpa" placeholder="GPA" value="${g}">
        <button onclick="this.parentElement.remove(); calcCGPA()" style="background:none; border:none; color:#ef4444; font-size:1.2rem;">
            <i class="ri-close-circle-fill"></i>
        </button>
    `;
    document.getElementById('semester-rows').appendChild(div);
}

function calcCGPA() {
    const rows = document.querySelectorAll('.semester-row');
    let w = 0, tc = 0, data = [];
    
    rows.forEach(r => {
        const c = parseFloat(r.querySelector('.sem-credit').value);
        const g = parseFloat(r.querySelector('.sem-gpa').value);
        if(c && g) { 
            w += c * g; 
            tc += c; 
            data.push({credit: c, gpa: g}); 
        }
    });
    
    const res = tc ? (w / tc).toFixed(2) : "0.00";
    
    const box = document.getElementById('cgpa-result-box');
    if(box) {
        document.getElementById('cgpa-score').innerText = res;
        box.style.display = 'block';
    } else {
        document.getElementById('cgpa-score').innerText = res;
    }
    
    document.getElementById('dash-cgpa').innerText = res;
    localStorage.setItem('cgpaData', JSON.stringify(data));
    updateChart(data);
}

// --- 6. BACKLOGS ---
function addBacklog() {
    const sub = document.getElementById('bl-subject').value;
    const sem = document.getElementById('bl-sem').value;
    if(!sub) return;
    
    const li = document.createElement('li');
    li.innerHTML = `<span><b>${sub}</b> (Sem ${sem})</span> <button onclick="this.parentElement.remove(); saveBacklogs()" style="color:red; background:none; border:none; cursor:pointer;">Clear</button>`;
    document.getElementById('backlog-list').appendChild(li);
    saveBacklogs();
    document.getElementById('bl-subject').value = '';
}

function saveBacklogs() {
    const list = document.getElementById('backlog-list').innerHTML;
    localStorage.setItem('backlogs', list);
    const count = document.querySelectorAll('#backlog-list li').length;
    document.getElementById('dash-backlogs').innerText = count;
}

function loadBacklogs() {
    document.getElementById('backlog-list').innerHTML = localStorage.getItem('backlogs') || '';
    saveBacklogs();
}

// --- 7. TARGET PREDICTOR ---
function calculateTarget() {
    const cur = parseFloat(document.getElementById('cur-cgpa').value);
    const cred = parseFloat(document.getElementById('cur-credits').value);
    const tar = parseFloat(document.getElementById('target-cgpa').value);
    const next = parseFloat(document.getElementById('next-credits').value);
    
    if(!cur || !cred || !tar || !next) return;
    
    const req = ((tar * (cred + next)) - (cur * cred)) / next;
    
    const box = document.getElementById('target-result-box');
    if(box) {
        const val = document.getElementById('target-result-val');
        val.innerText = req.toFixed(2);
        box.style.display = 'block';
        if(req > 10) val.style.color = "#ef4444"; 
        else val.style.color = "#312e81";
    } else {
        document.getElementById('target-result').innerText = "Required: " + req.toFixed(2);
    }
}

// --- 8. ADVANCED PDF EXPORT (COMBINED: LIVE INPUTS + 3 STATS) ---
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const primaryColor = [79, 70, 229]; 
    const secondaryColor = [107, 114, 128];
    
    // --- STEP 1: SCRAPE LIVE DATA FROM SCREEN ---
    let liveSubjects = [];
    const domRows = document.querySelectorAll('#subject-rows .input-group');
    
    domRows.forEach(r => {
        const sub = r.querySelector('.subject-input').value;
        const cr = r.querySelector('.credit').value;
        const gradeSelect = r.querySelector('.grade');
        // Get selected text (e.g., "O (10)") or default to "-"
        const grText = gradeSelect.selectedIndex > 0 ? gradeSelect.options[gradeSelect.selectedIndex].text : "-";
        
        if (sub || cr) {
            liveSubjects.push([
                sub || "Unknown Subject", 
                cr || "0", 
                grText
            ]);
        }
    });

    // Fallback: If screen is empty, try local storage
    if (liveSubjects.length === 0) {
        liveSubjects = JSON.parse(localStorage.getItem('latestSubjects') || '[]');
    }

    // --- STEP 2: GENERATE PDF HEADER ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Academic Performance Report", 14, 25);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 160, 25);

    // --- STEP 3: PROFILE SECTION ---
    const p = JSON.parse(localStorage.getItem('profile') || '{}');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Student Profile", 14, 55);
    doc.setFontSize(11);
    doc.setTextColor(...secondaryColor);
    doc.text(`Name: ${p.name || 'N/A'}`, 14, 65);
    doc.text(`Reg No: ${p.reg || 'N/A'}`, 14, 72);
    doc.text(`Department: ${p.dept || 'N/A'}`, 110, 65);
    doc.text(`College: ${p.coll || 'N/A'}`, 110, 72);
    
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 80, 196, 80);

    // --- STEP 4: SUMMARY STATS (3 BOXES: CGPA | GPA | BACKLOGS) ---
    const cgpa = document.getElementById('dash-cgpa').innerText;
    // Get GPA from the dashboard element, or default to 0.00
    const gpa = document.getElementById('dash-gpa') ? document.getElementById('dash-gpa').innerText : "0.00";
    const backlogCount = document.getElementById('dash-backlogs').innerText;
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Performance Summary", 14, 95);
    
    // Box 1: CGPA (Left)
    doc.setFillColor(243, 244, 246); // Light Grey
    doc.roundedRect(14, 100, 55, 25, 3, 3, 'F');
    doc.setFontSize(10); doc.setTextColor(...secondaryColor);
    doc.text("Current CGPA", 19, 110);
    doc.setFontSize(16); doc.setTextColor(...primaryColor); // Purple
    doc.text(cgpa, 19, 118);

    // Box 2: GPA (Middle)
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(77, 100, 55, 25, 3, 3, 'F');
    doc.setFontSize(10); doc.setTextColor(...secondaryColor);
    doc.text("Current GPA", 82, 110);
    doc.setFontSize(16); doc.setTextColor(37, 99, 235); // Blue
    doc.text(gpa, 82, 118);

    // Box 3: Backlogs (Right)
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(140, 100, 55, 25, 3, 3, 'F');
    doc.setFontSize(10); doc.setTextColor(...secondaryColor);
    doc.text("Active Backlogs", 145, 110);
    doc.setFontSize(16); doc.setTextColor(220, 38, 38); // Red
    doc.text(backlogCount, 145, 118);

    let finalY = 135;

    // --- STEP 5: RENDER THE LIVE TABLE ---
    if (liveSubjects.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Latest Semester Subject Details", 14, finalY);
        
        doc.autoTable({
            startY: finalY + 5,
            head: [['Subject Name', 'Credits', 'Grade Obtained']],
            body: liveSubjects, // Uses the scraped live data
            theme: 'grid',
            headStyles: { fillColor: [34, 197, 94] } // Green Header
        });
        
        finalY = doc.lastAutoTable.finalY + 15;
    }

    // --- STEP 6: HISTORY TABLE (EXISTING DATA) ---
    const cgpaData = JSON.parse(localStorage.getItem('cgpaData') || '[]');
    if (cgpaData.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Semester Progression History", 14, finalY);
        const tableBody = cgpaData.map((d, i) => [`Semester ${i + 1}`, d.credit, d.gpa]);
        doc.autoTable({
            startY: finalY + 5,
            head: [['Semester', 'Total Credits', 'SGPA']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: primaryColor }
        });
        finalY = doc.lastAutoTable.finalY + 15;
    }

    // --- STEP 7: BACKLOGS TABLE ---
    const backlogHTML = localStorage.getItem('backlogs') || '';
    if (backlogHTML.includes('<li>')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = backlogHTML;
        const items = tempDiv.querySelectorAll('li span');
        if (items.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text("Active Backlogs", 14, finalY);
            const backlogRows = Array.from(items).map((item, index) => [index + 1, item.innerText]);
            doc.autoTable({
                startY: finalY + 5,
                head: [['#', 'Subject Name']],
                body: backlogRows,
                theme: 'striped',
                headStyles: { fillColor: [220, 38, 38] }
            });
        }
    }

    doc.save("EduTrack_Report.pdf");
}

// --- UTILS ---
function loadData() {
    const d = JSON.parse(localStorage.getItem('cgpaData') || '[]');
    d.forEach(i => addSemesterRow(i.credit, i.gpa));
    calcCGPA();
    
    const p = JSON.parse(localStorage.getItem('profile') || '{}');
    if(p.name) document.getElementById('p-name').value = p.name;
    if(p.reg) document.getElementById('p-reg').value = p.reg;
    if(p.dept) document.getElementById('p-dept').value = p.dept;
    if(p.coll) document.getElementById('p-coll').value = p.coll;
}

function saveProfile() {
    const p = {
        name: document.getElementById('p-name').value,
        reg: document.getElementById('p-reg').value,
        dept: document.getElementById('p-dept').value,
        coll: document.getElementById('p-coll').value
    };
    localStorage.setItem('profile', JSON.stringify(p));
    alert("Profile Saved!");
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

let chart;
function initChart() {
    const ctx = document.getElementById('cgpaChart');
    if(!ctx) return;
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'GPA', data: [], borderColor: '#6366f1', tension: 0.4, fill: true, backgroundColor: 'rgba(99, 102, 241, 0.1)' }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 10 } } }
    });
}

function updateChart(data) {
    if(chart) {
        chart.data.labels = data.map((_, i) => `Sem ${i+1}`);
        chart.data.datasets[0].data = data.map(d => d.gpa);
        chart.update();
    }
}

// --- 8. SMART ATTENDANCE TRACKER (DATABASE VERSION) ---

async function addAttendance() {
    if(!currentUserId) { alert("Please login to use Cloud features"); return; }

    const sub = document.getElementById('att-subject').value;
    const total = document.getElementById('att-total').value;
    const present = document.getElementById('att-present').value;
    
    if(!sub || !total || !present) {
        alert("Please fill all fields correctly.");
        return;
    }
    
    if(parseInt(present) > parseInt(total)) {
        alert("Attended classes cannot be more than Total classes!");
        return;
    }

    // INSERT INTO SUPABASE
    const { error } = await dbClient.from('attendance').insert({
        user_id: currentUserId,
        subject: sub,
        total: parseInt(total),
        present: parseInt(present)
    });

    if(error) {
        console.error(error);
        alert("Error saving: " + error.message);
    } else {
        document.getElementById('att-subject').value = '';
        document.getElementById('att-total').value = '';
        document.getElementById('att-present').value = '';
        document.getElementById('att-subject').focus();
        loadAttendance();
    }
}

async function loadAttendance() {
    if(!currentUserId) return;

    const grid = document.getElementById('attendance-grid');
    if(!grid) return;
    
    const { data, error } = await dbClient.from('attendance').select('*');

    if(error) return console.error(error);
    
    grid.innerHTML = '';
    const target = 0.80;

    data.forEach(item => {
        const percentage = (item.present / item.total) * 100;
        let adviceText = "";
        let statusClass = "safe";
        let color = "#22c55e"; 

        if (percentage >= 80) {
            const bunkable = Math.floor((item.present / target) - item.total);
            if(bunkable > 0) {
                adviceText = `🎉 Safe! You can <b>BUNK</b> the next <b>${bunkable}</b> classes.`;
                statusClass = "safe";
                color = "#22c55e";
            } else {
                adviceText = `On the edge! Don't miss the next class.`;
                statusClass = "warning";
                color = "#f59e0b";
            }
        } else {
            const needed = Math.ceil(((target * item.total) - item.present) / (1 - target));
            adviceText = `⚠️ Low Attendance! You must <b>ATTEND</b> the next <b>${needed}</b> classes.`;
            statusClass = "danger";
            color = "#ef4444";
        }

        const card = document.createElement('div');
        card.className = 'att-card';
        card.innerHTML = `
            <button class="delete-att-btn" onclick="deleteAttendance(${item.id})">
                <i class="ri-close-circle-fill"></i>
            </button>
            <h3 style="margin-bottom: 5px;">${item.subject}</h3>
            <p style="color:var(--text-muted); font-size: 0.9rem;">${item.present} / ${item.total} Classes</p>
            <div class="chart-container">
                <canvas id="chart-${item.id}"></canvas>
                <div class="chart-center-text" style="color:${color}">${percentage.toFixed(1)}%</div>
            </div>
            <div class="att-status-msg ${statusClass}">${adviceText}</div>
        `;
        grid.appendChild(card);

        setTimeout(() => {
            new Chart(document.getElementById(`chart-${item.id}`), {
                type: 'doughnut',
                data: {
                    labels: ['Attended', 'Missed'],
                    datasets: [{
                        data: [item.present, item.total - item.present],
                        backgroundColor: [color, '#e5e7eb'], 
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: { cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, responsive: true, maintainAspectRatio: false }
            });
        }, 100);
    });
}

async function deleteAttendance(id) {
    if(!confirm("Are you sure?")) return;
    await dbClient.from('attendance').delete().eq('id', id);
    loadAttendance();
}

// Fallback for Guests
function loadAttendanceLocal() { /* Placeholder */ }


// --- 9. RESUME BUILDER (Same as before) ---
function addResumeProject() {
    const div = document.createElement('div');
    div.className = 'input-group';
    div.style.alignItems = "flex-start";
    div.innerHTML = `
        <div style="flex:1">
            <input type="text" class="res-proj-title" placeholder="Project Title" style="margin-bottom:5px; font-weight:bold;">
            <input type="text" class="res-proj-tech" placeholder="Tech Stack (e.g. React, Node.js)" style="margin-bottom:5px; font-size:0.9rem;">
            <textarea class="res-proj-desc" rows="2" placeholder="Description: What did it do? What was your role?"></textarea>
        </div>
        <button onclick="this.parentElement.remove()" style="color:red; background:none; border:none; font-size:1.2rem; margin-top:10px;">&times;</button>
    `;
    document.getElementById('res-projects-list').appendChild(div);
}

function addResumeExp() {
    const div = document.createElement('div');
    div.className = 'input-group';
    div.style.alignItems = "flex-start";
    div.innerHTML = `
        <div style="flex:1">
            <input type="text" class="res-exp-role" placeholder="Role (e.g. Web Dev Intern)" style="margin-bottom:5px; font-weight:bold;">
            <input type="text" class="res-exp-comp" placeholder="Company Name" style="margin-bottom:5px;">
            <textarea class="res-exp-desc" rows="2" placeholder="Key responsibilities and achievements..."></textarea>
        </div>
        <button onclick="this.parentElement.remove()" style="color:red; background:none; border:none; font-size:1.2rem; margin-top:10px;">&times;</button>
    `;
    document.getElementById('res-exp-list').appendChild(div);
}

// B. PDF Generation Logic (BUG FIXED)
function generateResume() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 1. Fetch User Data
    const p = JSON.parse(localStorage.getItem('profile') || '{}');
    const cgpa = document.getElementById('dash-cgpa').innerText;
    
    // 2. Fetch Resume Inputs
    const email = document.getElementById('res-email').value || "email@example.com";
    const phone = document.getElementById('res-phone').value || "+91 99999 99999";
    const linkedin = document.getElementById('res-linkedin').value || "";
    const github = document.getElementById('res-github').value || "";
    const skills = document.getElementById('res-skills').value || "";
    const certs = document.getElementById('res-certs').value || "";
    const hobbies = document.getElementById('res-hobbies').value || "";

    const name = (p.name || "YOUR NAME").toUpperCase();
    const dept = p.dept || "Department";
    const college = p.coll || "College Name";

    // --- PDF LAYOUT SETTINGS ---
    let y = 20; 
    const margin = 20;
    const pageWidth = 210;
    const contentWidth = pageWidth - (margin * 2);
    
    // Helper: Add Section Title
    function addSectionTitle(title) {
        y += 5;
        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.text(title.toUpperCase(), margin, y);
        y += 2;
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
    }

    // --- 1. HEADER ---
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.text(name, pageWidth / 2, y, null, null, "center");
    y += 7;

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(`${email} | ${phone}`, pageWidth / 2, y, null, null, "center");
    y += 5;
    
    let socialText = "";
    if (linkedin) socialText += `LinkedIn: ${linkedin} `;
    if (github) socialText += ` | GitHub: ${github}`;
    if (socialText) {
        doc.text(socialText, pageWidth / 2, y, null, null, "center");
        y += 10;
    } else {
        y += 5;
    }

    // --- 2. EDUCATION ---
    addSectionTitle("Education");
    
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(college, margin, y);
    
    // CGPA Aligned to Right
    doc.setFont("times", "bold"); // Ensure bold for label
    doc.text(`CGPA: ${cgpa}/10.0`, pageWidth - margin, y, null, null, "right");
    y += 5;

    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.text(`Bachelor of Technology in ${dept}`, margin, y);
    y += 8;

    // --- 3. TECHNICAL SKILLS ---
    if (skills) {
        addSectionTitle("Technical Skills");
        doc.setFont("times", "normal");
        const splitSkills = doc.splitTextToSize(skills, contentWidth);
        doc.text(splitSkills, margin, y);
        y += (splitSkills.length * 5) + 3;
    }

    // --- 4. PROJECTS (FIXED OVERLAP BUG) ---
    const projRows = document.querySelectorAll('#res-projects-list .input-group');
    if (projRows.length > 0) {
        addSectionTitle("Projects");
        projRows.forEach(row => {
            const title = row.querySelector('.res-proj-title').value;
            const tech = row.querySelector('.res-proj-tech').value;
            const desc = row.querySelector('.res-proj-desc').value;

            // 1. Print Title (Bold)
            doc.setFont("times", "bold");
            doc.setFontSize(11);
            doc.text(`${title}`, margin, y);
            
            // 2. Calculate Width of Title *BEFORE* changing font
            const titleWidth = doc.getTextWidth(title);

            // 3. Print Tech Stack (Italic) next to it
            if(tech) {
                doc.setFont("times", "italic");
                doc.setFontSize(10);
                doc.text(` (${tech})`, margin + titleWidth + 2, y);
            }
            y += 5;

            // 4. Description
            doc.setFont("times", "normal");
            doc.setFontSize(10);
            const splitDesc = doc.splitTextToSize(`• ${desc}`, contentWidth);
            doc.text(splitDesc, margin, y);
            y += (splitDesc.length * 5) + 4; // Add space after project
        });
    }

    // --- 5. EXPERIENCE ---
    const expRows = document.querySelectorAll('#res-exp-list .input-group');
    if (expRows.length > 0) {
        addSectionTitle("Experience / Internships");
        expRows.forEach(row => {
            const role = row.querySelector('.res-exp-role').value;
            const comp = row.querySelector('.res-exp-comp').value;
            const desc = row.querySelector('.res-exp-desc').value;

            doc.setFont("times", "bold");
            doc.text(role, margin, y);
            
            doc.setFont("times", "italic");
            doc.text(comp, pageWidth - margin, y, null, null, "right");
            y += 5;

            doc.setFont("times", "normal");
            const splitDesc = doc.splitTextToSize(`• ${desc}`, contentWidth);
            doc.text(splitDesc, margin, y);
            y += (splitDesc.length * 5) + 3;
        });
    }

    // --- 6. CERTIFICATIONS ---
    if (certs) {
        addSectionTitle("Certifications");
        doc.setFont("times", "normal");
        const splitCerts = doc.splitTextToSize(certs, contentWidth);
        doc.text(splitCerts, margin, y);
        y += (splitCerts.length * 5) + 3;
    }

    // --- 7. HOBBIES / INTERESTS ---
    if (hobbies) {
        addSectionTitle("Interests");
        doc.setFont("times", "normal");
        const splitHobbies = doc.splitTextToSize(hobbies, contentWidth);
        doc.text(splitHobbies, margin, y);
    }

    // Save File
    doc.save(`${name.replace(/ /g, "_")}_Resume.pdf`);
}

// --- 10. LIVE DEADLINE TRACKER (DATABASE VERSION) ---

let deadlineInterval = null;

async function addDeadline() {
    if(!currentUserId) { alert("Please login to use Cloud features"); return; }

    const title = document.getElementById('task-title').value;
    const dateInput = document.getElementById('task-date').value;
    const type = document.getElementById('task-type').value;

    if(!title || !dateInput) {
        alert("Please enter a title and date!");
        return;
    }

    const dateObj = new Date(dateInput);
    dateObj.setHours(23, 59, 59, 999);

    // 🔴 INSERT INTO SUPABASE
    await dbClient.from('deadlines').insert({
        user_id: currentUserId,
        title: title,
        date: dateObj.toISOString(),
        type: type
    });
    
    document.getElementById('task-title').value = '';
    document.getElementById('task-date').value = '';
    
    loadDeadlines();
}

async function loadDeadlines() {
    if(!currentUserId) return;

    const list = document.getElementById('deadline-list');
    if(!list) return;
    
    if (deadlineInterval) clearInterval(deadlineInterval);

    // 🔴 FETCH FROM SUPABASE (Sorted by Date)
    const { data, error } = await dbClient
        .from('deadlines')
        .select('*')
        .order('date', { ascending: true });

    if(error || !data) return;

    list.innerHTML = '';
    
    if(data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No upcoming deadlines. Relax! 🎉</p>';
        return;
    }

    data.forEach(task => {
        const div = document.createElement('div');
        div.className = `deadline-card`; 
        div.id = `card-${task.id}`;
        
        div.innerHTML = `
            <div class="deadline-info">
                <h4>${task.title}</h4>
                <div class="deadline-meta">
                    <span><i class="ri-calendar-event-line"></i> ${new Date(task.date).toLocaleDateString()}</span>
                    <span><i class="ri-price-tag-3-line"></i> ${task.type}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                <div class="countdown-box" id="timer-${task.id}">
                    <div class="time-unit"><span class="d">00</span><small>Day</small></div>
                    <div class="separator">:</div>
                    <div class="time-unit"><span class="h">00</span><small>Hr</small></div>
                    <div class="separator">:</div>
                    <div class="time-unit"><span class="m">00</span><small>Min</small></div>
                    <div class="separator">:</div>
                    <div class="time-unit"><span class="s">00</span><small>Sec</small></div>
                </div>
                <button onclick="deleteDeadline(${task.id})" style="color:#ef4444; background:none; border:none; font-size:1.2rem;">&times;</button>
            </div>
        `;
        list.appendChild(div);
    });

    startLiveTimer(data);
}

async function deleteDeadline(id) {
    if(!confirm("Are you sure?")) return;
    // 🔴 DELETE FROM SUPABASE
    await dbClient.from('deadlines').delete().eq('id', id);
    loadDeadlines();
}

function startLiveTimer(tasks) {
    function updateTimers() {
        const now = new Date().getTime();

        tasks.forEach(task => {
            const target = new Date(task.date).getTime();
            const diff = target - now;
            const timerBox = document.getElementById(`timer-${task.id}`);
            const card = document.getElementById(`card-${task.id}`);
            
            if (!timerBox) return;

            if (diff <= 0) {
                timerBox.innerHTML = `<span class="overdue-badge">EXPIRED</span>`;
                card.style.borderLeftColor = "#ef4444";
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                timerBox.querySelector('.d').innerText = days < 10 ? '0'+days : days;
                timerBox.querySelector('.h').innerText = hours < 10 ? '0'+hours : hours;
                timerBox.querySelector('.m').innerText = minutes < 10 ? '0'+minutes : minutes;
                timerBox.querySelector('.s').innerText = seconds < 10 ? '0'+seconds : seconds;

                if (days < 3) {
                    card.classList.add('urgent');
                    card.style.borderLeftColor = "#ef4444";
                } else {
                    card.classList.remove('urgent');
                    card.style.borderLeftColor = "#4f46e5";
                }
            }
        });
    }
    updateTimers();
    deadlineInterval = setInterval(updateTimers, 1000);
}

// Fallback for Guests
function loadDeadlinesLocal() { /* Placeholder */ }