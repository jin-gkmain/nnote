FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV WHISPERLIVEKIT_MODEL=base
ENV WHISPERLIVEKIT_LANGUAGE=ko

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.8.0 torchaudio==2.8.0 \
    && pip install --no-cache-dir whisperlivekit

EXPOSE 8000

CMD ["sh", "-c", "wlk --host 0.0.0.0 --port 8000 --model ${WHISPERLIVEKIT_MODEL:-base} --language ${WHISPERLIVEKIT_LANGUAGE:-ko}"]
