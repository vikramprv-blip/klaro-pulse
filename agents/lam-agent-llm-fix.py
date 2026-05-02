import re

with open('/Users/Vikram/klaro-pulse/agents/lam-agent.py', 'r') as f:
    c = f.read()

# Find and replace the entire get_lam_llm function
start = c.find('def get_lam_llm():')
end = c.find('\ndef ', start + 1)

new_func = '''def get_lam_llm():
    """
    Browser-Use LLM - uses langchain_groq.ChatGroq which has .provider attribute
    compatible with browser-use. Groq is fast, free, and works natively.
    """
    # 1. Groq with llama-3.3-70b — native browser-use .provider support
    try:
        from langchain_groq import ChatGroq
        if GROQ_KEY:
            os.environ["GROQ_API_KEY"] = GROQ_KEY
            llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2, max_tokens=4000)
            print("  Using Groq llama-3.3-70b-versatile for Browser Use")
            return llm
    except Exception as e:
        print(f"  Groq 3.3-70b failed: {e}")
    # 2. Groq smaller model
    try:
        from langchain_groq import ChatGroq
        if GROQ_KEY:
            llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.2)
            print("  Using Groq llama-3.1-8b-instant for Browser Use")
            return llm
    except Exception as e:
        print(f"  Groq 3.1-8b failed: {e}")
    # 3. OpenAI fallback
    try:
        from langchain_openai import ChatOpenAI
        if OPENAI_KEY:
            os.environ["OPENAI_API_KEY"] = OPENAI_KEY
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
            print("  Using OpenAI gpt-4o-mini for Browser Use")
            return llm
    except Exception as e:
        print(f"  OpenAI failed: {e}")
    raise Exception("No LLM available — set GROQ_API_KEY")

'''

c = c[:start] + new_func + c[end+1:]

with open('/Users/Vikram/klaro-pulse/agents/lam-agent.py', 'w') as f:
    f.write(c)
print('Done - lines:', len(c.split('\\n')))
