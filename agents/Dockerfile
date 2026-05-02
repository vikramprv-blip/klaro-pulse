FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

RUN pip install --no-cache-dir \
    playwright==1.44.0 \
    groq \
    openai \
    langchain-groq \
    langchain-openai \
    requests \
    supabase \
    python-dotenv

COPY lam-agent-v5.py .

ENTRYPOINT ["python3", "lam-agent-v5.py"]
