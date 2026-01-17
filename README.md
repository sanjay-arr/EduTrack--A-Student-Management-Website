# 🎓 EduTrack - Student Academic Management System

**EduTrack** is a comprehensive academic dashboard designed to help college students track their grades, manage attendance, meet deadlines, and build professional resumes. 
It features a **Hybrid Data Architecture**: personal data (like detailed marks) is stored locally for privacy, while cloud-sync features (Attendance, Deadlines) are powered by **Supabase** to allow access across devices.

## 🚀 Key Features

### 📊 Academic Analytics
* **GPA & CGPA Calculators:** Calculate semester-wise GPA and cumulative CGPA with support for credit weighting.
* **Target SGPA Predictor:** Input your current CGPA and target goal to calculate exactly what GPA you need in the next semester.
* **Visual Dashboard:** Real-time Chart.js graphs visualizing your academic performance curve.

### 🧠 Smart Tools
* **Smart Attendance Tracker:**  Visualizes attendance percentage.
    * **"Bunk" Calculator:** Tells you exactly how many classes you can skip while staying above 80%, or how many you *must* attend to recover.
* **Live Deadline Tracker:** Real-time countdown timers (Days/Hours/Mins) for assignments and exams.
    * *Visual Urgency:* Cards turn red when less than 3 days remain.

### 💼 Career & Reports
* **Resume Builder:** A built-in form to generate industry-standard PDF resumes.
* **PDF Reports:** One-click export of your entire academic summary (Grades + Backlogs + Profile).

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Backend / Auth:** [Supabase](https://supabase.com/) (PostgreSQL + GoTrue Auth)
* **Styling:** CSS Variables (Dark/Light mode support), Google Fonts (Outfit)
* **Libraries:**
    * `Chart.js` (Data Visualization)
    * `jsPDF` & `jspdf-autotable` (PDF Generation)
    * `RemixIcon` (UI Icons)

## ⚙️ Setup & Installation

To run this project locally, follow these steps:

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/sanjay-arr/EduTrack--A-Student-Management-Website
    cd EduTrack
    ```

Deployed Link: https://edutrack-chi.vercel.app/
