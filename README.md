# Ignite Agent

A production-ready AI agent platform built for the **Ignite-with-Delhi Hackathon**. Features real-time web search, knowledge graph visualization, and intelligent AI analysis.

## Tech Stack

- **Backend:** FastAPI + Python + LangChain + OpenAI
- **Frontend:** React + Vite + TailwindCSS
- **Database:** Neo4j (Graph Database)
- **Search:** Tavily API
- **Deployment:** Render

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- API Keys: OpenAI, Tavily, Neo4j AuraDB

### Setup (One Command)

**Windows:**
```bash
setup.bat
```

**Mac/Linux:**
```bash
bash setup.sh
```

This will:
1. Create a Python virtual environment at `./venv`
2. Install all backend dependencies
3. Install all frontend dependencies

### Configuration

1. **Backend Environment:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

2. **Frontend Environment:**
   ```bash
   cp frontend/.env.example frontend/.env.local
   # Edit if needed (default: localhost:8000)
   ```

### Running the Application

**Windows:**
```bash
start.bat
```

**Mac/Linux:**
```bash
bash start.sh
```

Or manually:

```bash
# Terminal 1 - Backend
source venv/bin/activate  # Windows: venv\Scripts\activate
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Project Structure

```
ignite-agent/
├── venv/                       # Python virtual environment
├── backend/
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── core/              # Config, settings
│   │   ├── models/            # Pydantic schemas
│   │   └── services/          # Tavily, Neo4j, LangChain
│   ├── main.py                # FastAPI entry
│   ├── requirements.txt       # Python deps
│   └── .env.example           # Env template
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom hooks
│   │   └── lib/               # API client
│   ├── package.json
│   └── .env.example
├── setup.bat / setup.sh       # One-time setup
├── start.bat / start.sh       # Quick start
└── render.yaml                # Deployment config
```

## Features

### 1. AI Chat Agent
- Conversational interface powered by LangChain + OpenAI
- Streaming responses for real-time interaction
- Context-aware responses

### 2. Knowledge Graph
- Visualize Neo4j graph data
- Interactive node exploration
- Subgraph analysis

### 3. Web Search Integration
- Real-time search via Tavily API
- Results displayed with source attribution
- Integrated into AI analysis

### 4. Dashboard Analytics
- Query analysis with AI
- Real-time metrics
- Search result aggregation

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/analyze` | POST | Analyze query with AI |
| `/api/v1/chat` | POST | Chat with agent |
| `/api/v1/chat/stream` | POST | Stream chat responses |
| `/api/v1/search` | POST | Web search via Tavily |
| `/api/v1/graph/nodes` | GET | Get graph nodes |
| `/api/v1/graph/subgraph` | GET | Get node subgraph |

## Deployment

### Render (Recommended)

1. Push code to GitHub
2. Connect repository to Render
3. Use `render.yaml` for automatic service configuration
4. Add environment variables in Render dashboard

### Manual Deployment

**Backend:**
```bash
cd backend
docker build -t ignite-agent-api .
docker run -p 8000:8000 --env-file .env ignite-agent-api
```

**Frontend:**
```bash
cd frontend
npm run build
# Deploy `dist/` folder to static hosting
```

## Environment Variables

### Backend (.env)
```bash
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
NEO4J_URI=bolt://...
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...
```

### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:8000
```

## Hackathon Tips

1. **Happy Path Focus:** Build the core demo flow first
2. **Mock Data:** Use fallback data for offline demos
3. **Deploy Early:** Test on Render within first 2 hours
4. **Pitch Ready:** Prepare 2-minute demo script

## License

MIT - Built for Ignite-with-Delhi Hackathon
