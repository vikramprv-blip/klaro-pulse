FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

RUN pip install --no-cache-dir \
    playwright==1.44.0 \
    groq \
    openai \
    langchain-groq \
    langchain-openai \
    requests \
    dnspython \
    supabase \
    python-dotenv

COPY lam-agent-v6.py .

RUN curl -sf -o /app/axe.min.js https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js && \
    echo "axe-core bundled: $(wc -c < /app/axe.min.js) bytes" 

ENTRYPOINT ["python3", "lam-agent-v6.py"]
