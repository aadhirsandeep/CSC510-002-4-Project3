# Installation Guide

This guide will help you set up the Calorie Connect project on your local machine.

## Prerequisites

### Backend
- **Python 3.11+** (required by `pyproject.toml`)
- **pip** (Python package manager)
- **PostgreSQL** (optional, SQLite is used by default)

### Frontend
- **npm** (or **yarn**)

## Backend Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd proj2/backend
```

### 2. Create a Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables (Optional)
Create a `.env` file in `proj2/backend/` with the following variables:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
ACCESS_EXPIRE_MIN=60
REFRESH_EXPIRE_DAYS=7

# Database (optional - defaults to SQLite)
DATABASE_URL=sqlite:///./app.db
# OR for PostgreSQL:
# POSTGRES_DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/cafe_calories

# Mistral AI (for review summarization)
MISTRAL_API_KEY=your-mistral-api-key

# Order Configuration
ORDER_CANCEL_GRACE_MINUTES=15
```

**Note:** If you don't create a `.env` file, the application will use default values from `app/config.py`.

### 5. Database Setup

#### Option A: SQLite (Default)
No additional setup required. The database file `app.db` will be created automatically when you first run the application.

#### Option B: PostgreSQL
1. Install PostgreSQL on your system
2. Create a database:
   ```sql
   CREATE DATABASE cafe_calories;
   ```
3. Set the `POSTGRES_DATABASE_URL` or `DATABASE_URL` environment variable (see step 4)
4. The tables will be created automatically on first run via SQLAlchemy

For more details, see `proj2/backend/DBSetup.md`.

### 6. Run the Backend Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base URL**: `http://localhost:8000`
- **Interactive API Docs**: `http://localhost:8000/docs`
- **Alternative Docs**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/`

## Frontend Installation

### 1. Navigate to Frontend Directory
```bash
cd proj2/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure API Endpoint (Optional)
By default, the frontend expects the API at `http://localhost:8000`. If your backend runs on a different URL, update `src/api/client.ts`:

```typescript
const API_BASE_URL = "http://your-backend-url:port";
```

### 4. Run the Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (Vite default port).

## Verify Installation

### Backend
1. Open `http://localhost:8000/` in your browser - you should see `{"ok": true, "service": "Cafe Calories API"}`
2. Open `http://localhost:8000/docs` to view the interactive API documentation

### Frontend
1. Open `http://localhost:5173` in your browser
2. The React application should load

## Running Tests

### Backend Tests
```bash
cd proj2/backend
pytest -q
```

For coverage report:
```bash
pytest --cov=app --cov-report=term-missing
```

### Frontend Tests
```bash
cd proj2/frontend
npx vitest run
```

## Seed Sample Data (Optional)

To populate the database with sample cafes, items, and users:

```bash
cd proj2/backend
python seed_cafes.py
# OR
python seed_data.py
```

## Troubleshooting

### Backend Issues

**Port Already in Use**
- Change the port: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8001`
- Or kill the process using port 8000

**Database Connection Errors**
- Check that your database URL is correct
- For PostgreSQL, ensure the database exists and credentials are correct
- For SQLite, ensure the directory is writable

**Import Errors**
- Ensure you're in the `proj2/backend` directory
- Activate your virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`

**JWT Secret Warning**
- Set a strong `JWT_SECRET` in your `.env` file for production use

### Frontend Issues

**npm install fails**
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then reinstall

**API Connection Errors**
- Ensure the backend is running on `http://localhost:8000`
- Check CORS settings in `app/main.py` if accessing from a different origin
- Verify `src/api/client.ts` has the correct API URL

**Port Already in Use**
- Vite will automatically try the next available port
- Or specify a port: `npm run dev -- --port 3000`

## Production Deployment

For production deployment:

1. **Set strong environment variables** (especially `JWT_SECRET`)
2. **Use PostgreSQL** instead of SQLite
3. **Configure proper CORS** origins in `app/main.py`
4. **Set up proper logging** and monitoring
5. **Use a production WSGI server** like Gunicorn:
   ```bash
   pip install gunicorn
   gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
   ```

## Additional Resources

- **Database Setup**: `proj2/backend/DBSetup.md`
- **Driver Assignment Testing**: `proj2/backend/DRIVER_ASSIGNMENT_TESTING.md`
- **OCR Setup**: `proj2/backend/OCR_README.md`
- **Review Summarizer**: `proj2/backend/ReviewSummarizer.md`
- **API Documentation**: `http://localhost:8000/docs` (when server is running)

