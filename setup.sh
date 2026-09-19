#!/bin/bash

echo "=========================================="
echo "Trace Control - Setup Script"
echo "=========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    exit 1
fi

if [ ! -x "venv/bin/python" ]; then
    echo "[1/5] Creating local virtual environment..."
    python3 -m venv venv || { echo "ERROR: Failed to create virtual environment"; exit 1; }
else
    echo "[1/5] Local virtual environment already exists."
fi

echo "[2/5] Activating local virtual environment..."
source venv/bin/activate

echo "[3/5] Upgrading pip..."
pip install --upgrade pip

echo "[4/5] Installing backend dependencies..."
pip install -r backend/requirements.txt || { echo "ERROR: Failed to install backend dependencies"; exit 1; }

echo "[5/5] Installing frontend dependencies..."
cd frontend || exit 1
npm install || { echo "ERROR: Failed to install frontend dependencies"; exit 1; }
cd ..

echo ""
echo "=========================================="
echo "Setup completed successfully!"
echo "=========================================="
echo ""
echo "To start the application:"
echo "  1. Backend: cd backend && ../venv/bin/python -m uvicorn main:app --reload --port 8000"
echo "  2. Frontend: cd frontend && npm run dev"
echo ""
echo "Don't forget to:"
echo "  - Copy backend/.env.example to backend/.env and add your API keys"
echo ""
