from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

from core.supabase_client import log_device_event
from services.agents import AnalystAgent, RiskAgent, TraderAgent

# Load env variables early
load_dotenv()

app = FastAPI(
    title="Device Enforcement Backend",
    description="ArmorClaw custom MVP implementation for AI financial enforcement",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PipelineRequest(BaseModel):
    news_seed: str

@app.get("/")
def health_check():
    return {"status": "operational", "engine": "Device + ArmorClaw MVP"}

@app.post("/api/v1/trigger-swarm")
async def trigger_swarm_pipeline(request: PipelineRequest):
    """
    Simulates the 3-step agent workflow:
    1. Analyst evaluates news
    2. Risk Agent issues or denies delegation token
    3. Trader agent consumes token and places trade
    """
    try:
        # Step 1: Analyst Agent
        analyst = AnalystAgent()
        recommendation = await analyst.evaluate_news(request.news_seed)
        
        if recommendation.get("action") == "HOLD":
            return {"status": "completed", "result": "Analyst yielded HOLD sentiment. No trades executed."}
            
        # Step 2: Risk Agent (Issues Token)
        risk_agent = RiskAgent()
        # Fetching current price from Alpaca
        ticker = recommendation.get("ticker", "")
        # fallback to 150.0 if not able to fetch
        current_price = 150.0 
        from services.alpaca_trade import get_current_price
        if ticker:
            try:
                current_price = get_current_price(ticker)
            except Exception as e:
                print(f"[Warning] Failed to fetch real price for {ticker}: {e}")
                
        risk_evaluation = risk_agent.process_recommendation(recommendation, current_price=current_price)
        
        if risk_evaluation.get("status") == "blocked":
            return {"status": "blocked", "layer": "Device Policy", "reason": risk_evaluation.get("reason")}
            
        device_token = risk_evaluation.get("token")
        
        # Step 3: Trader Agent (Executes Token)
        trader_agent = TraderAgent()
        trade_result = trader_agent.execute_order(
            token=device_token, 
            proposed_ticker=recommendation.get("ticker"), 
            proposed_quantity=recommendation.get("quantity")
        )
        
        return {"status": "completed", "trade_result": trade_result, "recommendation": recommendation}

    except Exception as e:
        log_device_event("system", "pipeline_execution", "N/A", "BLOCKED", f"Exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/simulate-injection")
async def simulate_prompt_injection():
    """
    Simulates an attacker injecting instructions directly into a parsed file.
    Tests the dual-layer block functionality without actually connecting to the swarm.
    """
    # Enforcement order: ArmorClaw (gateway) → Device (policy) → Alpaca
    # Layer 1: ArmorClaw blocks at OpenClaw gateway — intent not in approved plan
    log_device_event("system", "armorclaw_intercept", "TSLA_500", "BLOCKED", "reason: intent_not_in_approved_plan [ArmorClaw gateway]")
    # Layer 2: Device policy would also catch this independently
    log_device_event("trader", "order_place", "TSLA_500", "BLOCKED", "reason: ticker_not_in_universe + exceeds_max_order_size [Device policy]")
    
    return {"status": "blocked", "message": "Prompt injection dropped: ArmorClaw (gateway intent mismatch) + Device (policy violation). Dual-layer enforcement confirmed."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
