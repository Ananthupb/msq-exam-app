# MSQ (Multiple Select Questions) Exam Web Application

A full-stack, local-first web application for uploading study documents (**PDF, DOCX, DOC**), automatically extracting Multiple Select Questions (MSQ), managing question banks with bulk operations, taking timed examinations with secure server timers, and providing role-based access control (**Admin Portal** and **Student Portal**).

---

## 🌟 Key Features

* **Personal PDF/DOCX Practice Test (Student Self-Study)**:
  - Students can upload study material or question documents in **PDF, DOCX, or DOC** across any subject (Computer Science, Networking, Cybersecurity, Banking, Math, etc.).
  - Automatic question extraction with an inline preview, editing, and selection interface.
  - **Study Notes Notice**: When users upload raw study notes with 0 structured questions, an informational notice clearly explains that automatic question generation requires an AI generator, preventing random or hallucinated questions in local offline mode.
  - **Private Personal Question Bank**: Questions uploaded or created by a user are strictly isolated to their own account; students cannot view or edit questions from admins or other students.
  - Full personal question management: search, add manually, edit, single delete, multi-select bulk delete, and complete personal bank wipe.
  - Custom personal practice test creation with configurable duration presets (5m, 10m, 20m, 30m, 60m, or custom minutes), question counts, and question/option randomization.
* **Role-Based Access Control (RBAC)**:
  - **Student Role**: Take exams, create personal practice tests from uploaded documents, manage personal question bank, review scorecards, delete own attempts, and resume in-progress exams upon refresh. Restricted from viewing answers prior to submission or accessing admin tools.
  - **Admin Role**: Full system dashboard, Question Bank Manager (individual, bulk, and bank wipe), document upload & parsing, exam configuration, user management, and global submission auditing.
* **Administrator CLI Utility**: Interactive command-line script (`backend/create_admin.py`) for initializing and managing administrator accounts.
* **Question Bank Individual & Bulk Operations**:
  - Checkbox selection per question.
  - **Select All** checkbox to select all or partial questions.
  - **Delete Selected** button with item count and confirmation.
  - **Delete All** button with strong confirmation modal ("*Are you sure you want to delete all questions? This action cannot be undone.*").
  - Deleting questions never purges student exam history or attempt scorecards.
* **Secure Server-Side Timer & Session Resumption**:
  - Timer expiration verified by the backend upon submission.
  - In-progress answers and current question auto-saved every 5 seconds.
  - Full recovery if browser refreshes, reconnects, or reboots.
* **Multi-Format Document Ingestion**: Upload `.pdf`, `.docx`, and `.doc` files (up to 15MB) with automatic file validation and text extraction powered by PyMuPDF and `python-docx`.
* **Zero-API Document Parsing**: Extracts questions, options, correct answers, and explanations directly using a high-precision heuristic rule engine without paid APIs.
* **Pluggable AI Architecture**: Engineered with an abstract `QuestionGenerator` interface so LLM-based AI generation (e.g. Gemini, OpenAI) can be plugged in seamlessly.
* **Instant MSQ Grading & Analytics**:
  - Strict MSQ grading policy (full credit only if all correct options and no incorrect options are picked).
  - Scorecard with Percentage, Correct, Wrong, Skipped, and Time Taken metrics.
  - Side-by-side comparison of user selections vs official correct answers and explanations.

---

## 📁 Project Structure

```text
msq-exam-app/
├── backend/
│   ├── app/
│   │   ├── database/       # SQLAlchemy engine, session, Base
│   │   ├── models/         # Database models (User, Question, Exam, ExamQuestion, ExamAttempt)
│   │   ├── schemas/        # Pydantic DTOs for request/response validation
│   │   ├── parsers/        # QuestionGenerator ABC & DocumentQuestionParser
│   │   ├── services/       # DocumentService & ExamService
│   │   ├── core/           # Security (bcrypt, JWT tokens, dependencies & RBAC)
│   │   ├── routes/         # FastAPI endpoints (auth, admin, upload, questions, exams, results)
│   │   └── main.py         # FastAPI app factory, CORS, lifespan
│   ├── create_admin.py     # Interactive CLI tool to create admin accounts
│   ├── tests/              # Pytest test suite (auth, rbac, parser, exam flow)
│   ├── requirements.txt    # Python backend dependencies
│   ├── pytest.ini          # Pytest path configuration
│   └── Dockerfile          # Backend container specification
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                 # Public Landing Page
│   │   │   ├── login/page.tsx           # Authentication (Login / Register / Show-Hide Password)
│   │   │   ├── dashboard/page.tsx       # Student Portal (Personal stats, resume, take exams)
│   │   │   ├── profile/page.tsx         # User Profile & Logout
│   │   │   ├── admin/page.tsx           # Admin Dashboard Overview
│   │   │   ├── admin/questions/page.tsx # Question Bank (Bulk delete, Select All, Wipe Bank)
│   │   │   ├── admin/upload/page.tsx    # Admin Document Upload & Parsing
│   │   │   ├── admin/exams/page.tsx     # Exam Management & Publishing
│   │   │   ├── admin/users/page.tsx     # User Role & Account Management
│   │   │   ├── admin/attempts/page.tsx  # Global Exam Submissions Audit
│   │   │   ├── exam/configure/          # Exam settings (count, duration presets, shuffle)
│   │   │   ├── exam/[id]/               # Exam room with server timer & question palette
│   │   │   ├── results/[id]/            # Scorecard & in-depth question review
│   │   │   └── history/page.tsx         # Exam History
│   │   ├── components/Navbar.tsx        # Dynamic RBAC Navigation Bar
│   │   ├── context/AuthContext.tsx      # React Auth Context & session management
│   │   ├── lib/api.ts                   # Frontend API client with JWT injection
│   │   └── types/index.ts               # TypeScript interfaces
│   ├── package.json
│   └── Dockerfile                       # Frontend container specification
├── samples/
│   ├── generate_samples.py              # Generator for sample PDF, DOCX, and TXT files
│   ├── sample_exam.pdf                  # Pre-built sample PDF with 7 MSQ questions
│   ├── sample_exam.docx                 # Pre-built sample DOCX with 7 MSQ questions
│   └── sample_exam.txt                  # Pre-built plain text sample
├── uploads/                             # Directory for uploaded document files
├── docker-compose.yml                   # Multi-container runner
├── .gitignore                           # Git ignore rules
└── README.md
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Python 3.10+** (Tested on Python 3.13)
- **Node.js 18+** (Tested on Node.js 24)
- **npm** or **yarn**

---

### 1. Backend Setup

Open a terminal in the root directory:

```bash
cd backend
python -m venv venv
```

**Activate Virtual Environment:**

* On Windows (PowerShell):
  ```powershell
  .\venv\Scripts\activate
  ```
* On Linux / macOS:
  ```bash
  source venv/bin/activate
  ```

**Install Dependencies:**

```bash
pip install -r requirements.txt
```

**Create Initial Administrator Account:**

Run the interactive CLI tool:

```bash
python create_admin.py
```
Or provide CLI arguments directly:
```bash
python create_admin.py --username admin --email admin@msqexam.local --password AdminPass123!
```

**Run Backend Server:**

```bash
uvicorn app.main:app --reload --port 8000
```

The backend server will run on:
- API Root: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup

Open a second terminal window in the root directory:

```bash
cd frontend
npm install
npm run dev
```

The frontend application will run on:
- Web App: `http://localhost:3000`

---

## 🔑 Default Roles & Access

| Role | Default Credentials | Destination After Login | Available Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` / `AdM1n$2611` | `/admin` | Question Bank Manager, Bulk Delete, Upload, Exam Publishing, User Management, Global Audit |
| **Student** | Register via `/login` | `/dashboard` | Take Exams, Create Topic & Document Practice Tests, Manage Personal Questions, Personal Scorecards |


---

## 🧪 Running Automated Tests

Run the full pytest suite for auth, RBAC, parsers, and exam lifecycle:

```bash
cd backend
venv\Scripts\pytest
```

---

## 📡 Key API Endpoints

### Authentication & Users
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public | Authenticate with username/email & password |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated user profile |
| `POST` | `/api/auth/logout` | Authenticated | Terminate session |

### Admin Control & System Audit
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Admin | Overall counts for questions, exams, users, submissions |
| `GET` | `/api/admin/users` | Admin | List all registered users with attempt counts |
| `PUT` | `/api/admin/users/{id}` | Admin | Update user role (admin/user) or active status |
| `DELETE` | `/api/admin/users/{id}` | Admin | Delete a user account (cannot self-delete) |
| `GET` | `/api/admin/attempts` | Admin | View all student exam submissions |

### Question Bank & Bulk Operations
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/questions` | Authenticated | List questions with keyword search |
| `POST` | `/api/questions` | Admin | Create single or bulk questions in bank |
| `PUT` | `/api/questions/{id}` | Admin | Update question text, options, or correct answers |
| `DELETE` | `/api/questions/{id}` | Admin | Delete an individual question |
| `DELETE` | `/api/questions/bulk` | Admin | Delete selected questions by ID list |
| `DELETE` | `/api/questions/all` | Admin | Delete all questions (bank wipe) |

### Exam Lifecycle & Results
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/exams` | Admin | Publish an exam with time limits and randomization |
| `GET` | `/api/exams` | Authenticated | List published exams |
| `POST` | `/api/exams/{id}/start` | Authenticated | Start or resume attempt with server timer |
| `POST` | `/api/exams/{id}/save-progress` | Authenticated | Periodic auto-save of current question & answers |
| `POST` | `/api/exams/{id}/submit` | Authenticated | Final submit with server-side timer validation |
| `GET` | `/api/results` | Authenticated | Get exam history (students see own; admins see all) |
| `DELETE` | `/api/results/{id}` | Authenticated | Delete exam attempt (students can delete own) |

---

## 🐳 Running with Docker Compose

You can launch both frontend and backend in isolated containers:

```bash
docker-compose up --build
```

---

## 🔒 Security & Deployment Best Practices

- **Bcrypt Hashing**: Passwords are never stored in plaintext and are salted using `bcrypt`.
- **JWT Authentication**: Cryptographically signed access tokens with configurable expiration (7-day default, 30-day "remember me").
- **Server-Side Authorization**: Endpoints are protected via FastAPI dependencies (`require_admin`, `get_current_user`), blocking unauthorized actions at the server level.
- **Database Portability**: Ready to connect to PostgreSQL or Supabase in production by setting `DATABASE_URL=postgresql://user:password@host:port/dbname`.
