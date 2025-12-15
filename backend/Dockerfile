FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for building some wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Set pip timeout and disable cache
ENV PIP_DEFAULT_TIMEOUT=100 \
    PIP_NO_CACHE_DIR=1
# Install dependencies in stages to better utilize cache and avoid timeouts
RUN pip install --upgrade pip && \
    pip install torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
