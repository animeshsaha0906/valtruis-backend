import os
import json
import feedparser
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import chromadb
from google import genai

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Broadened for local development stability
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB globally so it persists during runtime
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(name="valtruis_pipeline")

class CompanyInsight(BaseModel):
    name: str = Field(description="Name of the company (Must be exactly one of the 5 watchlist targets)")
    sector: str = Field(description="Specific VBC sector, e.g., Home-Based Primary Care, Kidney Care, Behavioral Health")
    alignment: int = Field(description="VBC Alignment Score out of 100 based on risk-bearing capabilities")
    valuation: int = Field(description="Predictive 24-month Valuation in millions ($M)")
    sentiment: str = Field(description="Positive, Neutral, or Negative based on how latest macro news impacts them")
    description: str = Field(description="One-sentence description of their care model")
    why_invest: str = Field(description="Detailed macro analysis of why Valtruis should invest in them right now")
    key_metrics: str = Field(description="Key operational metrics, e.g., 'Covered Lives: 50k, ARR: $12M'")

class PortfolioData(BaseModel):
    companies: list[CompanyInsight]

class ChatRequest(BaseModel):
    message: str

def scrape_healthcare_news():
    try:
        feed_url = "https://www.healthcaredive.com/feeds/news/"
        parsed_feed = feedparser.parse(feed_url)
        live_articles = []
        for entry in parsed_feed.entries[:15]:
            clean_summary = entry.summary.replace('<p>', '').replace('</p>', '')
            live_articles.append(f"Market News: {entry.title}. Context: {clean_summary}")
        return live_articles
    except Exception:
        return ["Market News: CMS signals continued support for downside risk models in 2026. Context: Regulatory updates favor value-based care frameworks over fee-for-service ecosystems."]

@app.get("/api/companies")
def get_realtime_insights():
    market_news = scrape_healthcare_news()
    
    vbc_watchlist = [
        "Wayspring: A value-based care entity specializing in substance use disorder (SUD), taking on downside risk for high-risk populations.",
        "Wellvana: A premier VBC enabler helping independent primary care physicians transition to full capitation and Medicare Advantage risk models.",
        "Main Street Health: A technology and navigation platform delivering value-based care structures specifically to rural clinics and providers.",
        "InStride Health: A tech-enabled care model providing coordinated, insurance-backed specialty care for pediatric anxiety and OCD under VBC contracts.",
        "Thyme Care: An oncology care management platform partnering with payers and risk-bearing providers to lower cancer care costs."
    ]
    
    # Refresh documents in vector space safely
    all_documents = market_news + vbc_watchlist
    try:
        collection.add(
            documents=all_documents,
            ids=[f"doc_{i}" for i in range(len(all_documents))]
        )
    except Exception:
        pass # Ignore if IDs already exist in this runtime session
    
    results = collection.query(
        query_texts=["Value-based care startups, risk contracts, funding, or CMS reimbursement changes"],
        n_results=10
    )
    retrieved_context = " ".join(results["documents"][0]) if results["documents"] else ""
    
    client = genai.Client()
    
    # Reinforced prompt enforcing the inclusion of all target companies
    prompt = f"""
    Act as a Senior Investment Director at Valtruis. Analyze how current macro conditions and market developments affect our target value-based care startup watchlist.
    
    Live Market Context:
    {retrieved_context}
    
    Target Watchlist to Analyze:
    1. Wayspring (Substance use disorder VBC asset)
    2. Wellvana (Primary care capitation enabler)
    3. Main Street Health (Rural provider VBC platform)
    4. InStride Health (Pediatric behavioral health risk contracts)
    5. Thyme Care (Oncology care management platform)
    
    CRITICAL REQUIREMENT: You MUST populate the 'companies' array with EXACTLY 5 objects—one for each of the 5 targets listed above. Do not leave the array empty. Even if a target isn't mentioned in the live news headlines, use your core industry knowledge combined with the live macro context to project their 24-month valuation ($M), VBC alignment score (70-100), market sentiment, and an institutional investment thesis.
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=prompt,
        config={
            'response_mime_type': 'application/json',
            'response_schema': PortfolioData,
        }
    )
    
    return json.loads(response.text)

@app.post("/api/chat")
def chat_with_analyst(request: ChatRequest):
    try:
        results = collection.query(query_texts=[request.message], n_results=4)
        retrieved_context = " ".join(results["documents"][0]) if results["documents"] else ""
    except Exception:
        retrieved_context = "Value-based care market acceleration."

    client = genai.Client()
    
    chat_prompt = f"""
    You are an AI Investment Analyst for Valtruis, a private equity firm focused on Value-Based Care (VBC).
    Answer the user's question professionally, concisely, and cleanly. 
    
    Context from our research database: {retrieved_context}
    User Question: {request.message}
    
    Always frame your answers around shifting away from fee-for-service models into downside risk allocation.
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=chat_prompt
    )
    
    return {"reply": response.text}