# Virtual Patient System 🏥

> LLM-based virtual patient simulation system for medical student training at TUM

An interactive web application that simulates patient encounters for medical students to practice anamnesis (patient history taking) using AI-powered virtual patients.

🚀 **Deployed at:** [https://virtual-patients-tum.com](https://virtual-patients-tum.com)

*Alternative URL:* [https://virtual-patient-system-457056093077.europe-west3.run.app](https://virtual-patient-system-457056093077.europe-west3.run.app)

## 🌟 Features

- **AI-Powered Virtual Patients**: 7+ realistic patient scenarios powered by OpenAI GPT-4
- **Interactive Chat Interface**: Natural conversation flow with audio transcription support
- **TUM Authentication**: Secure login via TUM OIDC (OpenID Connect)
- **Session Tracking**: All conversations are persisted with user IDs for research and evaluation
- **Multi-language Support**: German language patient simulations
- **Analytics Dashboard**: Track token usage, session history, and conversation metrics
- **Responsive Design**: Material UI-based interface works on desktop and mobile

## 🏗️ Architecture

- **Backend**: FastAPI (Python 3.9) with PostgreSQL database
- **Frontend**: React 18 + TypeScript + Vite + Material UI
- **Database**: PostgreSQL 17 (Cloud SQL on Google Cloud)
- **Deployment**: Google Cloud Run (containerized)
- **AI**: OpenAI GPT-4 mini for patient simulation

## 🚀 Deployment

The application is deployed on Google Cloud Platform:

- **Production URL**: `https://virtual-patients-tum.com`
- **Cloud Run URL**: `https://virtual-patient-system-457056093077.europe-west3.run.app`
- **CI/CD**: Automated deployment via GitHub Actions
- **Infrastructure**: Cloud Run + Cloud SQL + Artifact Registry

### Deployment Architecture

```
GitHub → GitHub Actions → Docker Build → Artifact Registry → Cloud Run
                                                                  ↓
                                                            Cloud SQL (PostgreSQL)
```

## 📋 Patient Cases

The system includes the following medical scenarios:

1. **Bauchschmerzen** (Abdominal Pain) - Appendicitis simulation
2. **Brustschmerzen** (Chest Pain) - Myocardial infarction
3. **Kopfschmerzen** (Headache) - Migraine
4. **Rückenschmerzen** (Back Pain) - Lumbar disc herniation
5. **Husten** (Cough) - Pneumonia
6. **Dyspnoe** (Shortness of Breath) - Asthma exacerbation
7. **Depression** - Mental health scenario

## 🛠️ Local Development

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 16+
- OpenAI API key

### Backend Setup

1. **Create virtual environment**
   ```bash
   python3 -m venv mri_env
   source mri_env/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp env-template .env
   # Edit .env and add your credentials
   ```

4. **Set up database**
   Ensure your Docker Postgres container is running, then create the database:
   ```bash
   createdb -h localhost -U postgres vpatient
   alembic upgrade head
   ```

5. **Run backend**
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API docs: http://localhost:8000/docs

## 📊 Database Schema

- **cases**: Patient case definitions
- **sessions**: User conversation sessions (includes TUM user_id)
- **messages**: Individual chat messages with token tracking

## 🔐 Authentication

### TUM Users (Students)
- Login via TUM Single Sign-On (OIDC)
- All sessions are tracked with TUM ID for research purposes
- Data persisted to PostgreSQL database

### VHB Users (External)
- Login with shared password
- Sessions stored in-memory only (not persisted)
- Used for external course participants

## 📈 Analytics & Research

The system tracks:
- Session history per user
- Message counts and token usage
- Conversation transcripts
- Case completion rates

Export endpoints available at `/api/export` and `/api/analytics/summary`

## 🔧 Tech Stack

**Backend**
- FastAPI 0.116+
- SQLAlchemy 2.0 (async)
- Alembic (migrations)
- OpenAI Python SDK
- Psycopg 3 (PostgreSQL driver)

**Frontend**
- React 18
- TypeScript 5.6
- Vite 6
- Material UI 6
- React Router 7

**Infrastructure**
- Google Cloud Run
- Google Cloud SQL (PostgreSQL)
- Google Artifact Registry
- GitHub Actions (CI/CD)

## 📝 Environment Variables

Key environment variables (see `env-template` for full list):

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key
- `APP_SECRET_KEY`: Session encryption key
- `OIDC_*`: TUM authentication configuration
- `REQUIRE_AUTH`: Enable/disable authentication
- `VHB_PASSWORD`: Optional external user password

## 🐳 Docker

Build and run with Docker:

```bash
docker build -t virtual-patient-system .
docker run -p 8080:8080 --env-file .env virtual-patient-system
```

## 📄 License

This project is developed at Technical University of Munich (TUM) for educational purposes.

## 👥 Contributors

Developed by the Medical Education team at TUM.

## 🤝 Contributing

This is an internal TUM project. For questions or suggestions, please contact the maintainers.

---

**Note**: Use `localhost` (not `127.0.0.1`) for local development to ensure proper cookie handling between frontend and backend.
