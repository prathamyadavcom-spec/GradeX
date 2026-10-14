# 📊 GradeX — Analytics & AI Student Success Platform

**Understand Every Learner. Improve Every Lesson.**

GradeX joins academic, attendance, LMS, engagement, placement, skills and feedback data into one unified student view, with an explainable **Student Success Score**, predicted risk, student segments and tracked interventions. Built for **HacXelerate · Challenge 04 (KPMG in India): AI-Powered Student Analytics and Success Platform**.

[![Status](https://img.shields.io/badge/status-active-success.svg)](#)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](#)
[![Deployed on Vercel](https://img.shields.io/badge/deployed-Vercel-black.svg)](https://gradex-rho.vercel.app/)

🔗 **Live demo:** https://gradex-rho.vercel.app/

> All data in the demo is fictional. No real student is represented.

---

## ✨ Features

- **📈 At a Glance**: six subject rings, lowest subject highlighted first
- **🔄 Semester Comparison**: Sem 3 vs Sem 5 progress and a semester journey timeline
- **🎯 What-If Simulator**: see what it takes to reach the next grade band
- **🗓️ Attendance Planner**: how many classes you can still miss, or must attend in a row
- **🧮 CGPA Calculator**: editable credits, 10-point scale, semester-by-semester GPA
- **🕒 Weekly Timetable**: day view with "now" and "next up" class
- **💬 Ask GradeX**: plain-language questions answered from the demo dataset
- **⭐ Student Success Score**: explainable score from 7 data sources, with drivers
- **🚦 Risk Flags & Segments**: rule-based flags plus a transparent early-warning model
- **🎓 Placement Readiness**: scored separately so strong grades never hide weak readiness
- **👩‍🏫 Teaching Intelligence**: learning journeys, evidence-based gaps, intervention tracker (before/after)
- **🏫 Campus Dashboard**: institution-level summaries, trends and data completeness

---

## 👥 Roles

| Role | What they get |
| ---- | ------------- |
| **Student** | Progress, attendance, CGPA, timetable, supportive-language status, study suggestions |
| **Teacher** | Teaching Intelligence: gaps, advisor, class insights, intervention tracker |
| **Administrator** | Campus analytics: trends, support indicators, follow-ups, data completeness |

---

## 🧠 How the Student Success Score Works

`Score = Σ indicator (0–100) × weight`

| Indicator | Weight |
| --------- | ------ |
| Academic average | 35% |
| Attendance | 15% |
| LMS activity | 15% |
| Campus engagement | 15% |
| Skills assessments | 10% |
| Student satisfaction | 10% |

Missing indicators are **excluded and weights rescaled**, never counted as zero.

**Placement readiness** (separate): aptitude 30%, coding 30%, mock interview 25%, technical skills + certifications 15%. Under 50 = support needed, 50–64 = build readiness, 65+ = ready.

**Risk:** transparent rules (declining results, low subject average, repeated topic difficulty, missing assessments) plus a hand-set logistic early-warning model. Full details in [docs/SCORING.md](docs/SCORING.md).

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/<your-username>/gradex.git
cd gradex

# 2. Install dependencies (if your project uses a package manager)
npm install

# 3. Run locally
npm run dev
```

Open http://localhost:5173 (or the port shown in your terminal).

> If the site is plain static HTML, skip steps 2–3 and open `index.html` or run `npx serve .`.

---

## 📋 Project Structure

```
gradex/
├── src/                    # Site source (pages, components, styles, scripts)
├── public/                 # Static assets (logo, images, fonts)
├── data/                   # Fictional demo datasets (7 source tables)
├── docs/
│   ├── SCORING.md          # Success Score + risk model note
│   └── PITCH.md            # Pitch outline (6 slides)
├── CONTEXT.md              # Full project context
├── DEPLOYMENT.md           # Deploy to Vercel
├── HACKATHON_PRESENTATION.md
├── .gitignore
├── LICENSE
└── README.md
```

> Adjust folder names to match your actual code layout.

---

## 🗃️ Data Sources (7 tables, joined on `student_id`)

Academic · Attendance · LMS · Engagement · Placement · Skills · Feedback

Cleaning rules: duplicates removed, out-of-range marks clipped, attendance capped at recorded sessions, names normalised, orphan rows dropped and logged.

---

## ⚠️ Limitations (stated on purpose)

1. Fictional data only.
2. Flags are prompts for a human conversation, never labels shown to students.
3. Before/after change is observed, not causal.
4. Subject-level marks only; no question-level analysis.
5. Predictive weights are illustrative; an institution fits them on its own outcome history.

---

## 👥 The Team — Five people, one platform

| Member | Role | Responsibilities |
| ------ | ---- | ---------------- |
| **Ehtishamul Haq** | Team Leader | Product direction, scope, integration of every part into one entry |
| **Pratham Yadav** | Backend · AI | Backend and AI tools, data pipeline, scoring engine, prediction model |
| **Priyanshu Saroj** | UI · UX | Light and dark glass design system, user flows, feature map |
| **Anushka Singh Chauhan** | Presentation | PPT designer: pitch deck, visual story, slide structure |
| **Adya Srivastava** | Pitch | Pitcher: narrative, demo walkthrough, Q&A with judges |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

## 📄 License

MIT. See [LICENSE](LICENSE).

## 🙏 Acknowledgments

- KPMG in India, Smart Campus Analytics challenge
- HacXelerate organisers
- [Vercel](https://vercel.com) for hosting

---

**Built with ❤️ by Team GradeX for students, faculty and campuses.**
