# Touchline Live-Test RC1 — single-process FastAPI app + FC Simulator v0.7
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py bridge.py store.py ./
COPY web ./web
COPY simulator/fc_simulator ./simulator/fc_simulator
COPY simulator/data ./simulator/data
COPY tools ./tools
ENV APP_ENV=production TOUCHLINE_DATA_DIR=/data
VOLUME /data
EXPOSE 8000
CMD ["python", "server.py"]
