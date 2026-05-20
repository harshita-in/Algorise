import os
import requests
import numpy as np
import datetime
from dotenv import load_dotenv

load_dotenv()

# Dictionary of popular stocks for instant offline lookup
POPULAR_STOCKS = {
    "apple": "AAPL",
    "google": "GOOG",
    "alphabet": "GOOG",
    "amazon": "AMZN",
    "microsoft": "MSFT",
    "tesla": "TSLA",
    "meta": "META",
    "facebook": "META",
    "nvidia": "NVDA",
    "netflix": "NFLX",
    "amd": "AMD",
    "intel": "INTC",
    "disney": "DIS",
    "coca cola": "KO",
    "pepsi": "PEP",
    "walmart": "WMT",
    "jp morgan": "JPM",
    "jpmorgan": "JPM",
    "visa": "V",
    "mastercard": "MA",
    "adobe": "ADBE",
    "salesforce": "CRM",
    "nike": "NKE",
    "mcdonalds": "MCD",
    "exxon": "XOM",
    "chevron": "CVX",
}

MOCK_BASE_PRICES = {
    "AAPL": 180.0,
    "GOOG": 170.0,
    "AMZN": 185.0,
    "MSFT": 420.0,
    "TSLA": 175.0,
    "META": 470.0,
    "NVDA": 900.0,
    "NFLX": 600.0,
    "AMD": 160.0,
    "INTC": 35.0,
    "DIS": 115.0,
    "KO": 60.0,
    "PEP": 165.0,
    "WMT": 60.0,
    "JPM": 195.0,
    "V": 275.0,
    "MA": 460.0,
    "ADBE": 480.0,
    "CRM": 290.0,
    "NKE": 95.0,
    "MCD": 280.0,
    "XOM": 115.0,
    "CVX": 155.0,
    "DEFAULT": 100.0
}

def resolve_symbol(query: str, api_key: str = None) -> dict:
    """
    Resolves a search query (like 'Apple') to a stock ticker symbol (like 'AAPL').
    First checks the local POPULAR_STOCKS dictionary.
    Falls back to Twelve Data's symbol_search API if API key is present.
    If not found, returns a default match based on the query.
    """
    clean_query = query.strip().lower()
    
    # 1. Local Lookup
    if clean_query in POPULAR_STOCKS:
        symbol = POPULAR_STOCKS[clean_query]
        # Match casing for default name
        name = query.title()
        return {"symbol": symbol, "name": name, "exchange": "US Exchange", "source": "local"}
        
    # 2. Check substrings in popular stocks
    for name, sym in POPULAR_STOCKS.items():
        if clean_query in name or name in clean_query:
            return {"symbol": sym, "name": name.title(), "exchange": "US Exchange", "source": "local_partial"}
            
    # 3. Call Twelve Data Symbol Search API if api_key is available
    if not api_key:
        api_key = os.getenv("TWELVE_DATA_API_KEY")
        
    if api_key and api_key != "abcd":
        try:
            url = f"https://api.twelvedata.com/symbol_search?symbol={query}&apikey={api_key}"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if "data" in data and len(data["data"]) > 0:
                    # Filter for stock-like instruments, preferably US
                    stocks = [item for item in data["data"] if item.get("type") == "Common Stock"]
                    best_match = stocks[0] if stocks else data["data"][0]
                    return {
                        "symbol": best_match["symbol"],
                        "name": best_match["instrument_name"],
                        "exchange": best_match["exchange"],
                        "source": "twelvedata_api"
                    }
        except Exception as e:
            print(f"Error resolving symbol via Twelve Data: {e}")
            
    # 4. Fallback if all else fails - generate a pseudo ticker from query
    pseudo_ticker = "".join([c for c in query if c.isalnum()]).upper()[:4]
    if not pseudo_ticker:
        pseudo_ticker = "STK"
    return {
        "symbol": pseudo_ticker,
        "name": query.title(),
        "exchange": "Simulated Exchange",
        "source": "fallback"
    }

def generate_mock_data(symbol: str, interval: str, count: int) -> list:
    """
    Generates realistic historical stock data using Geometric Brownian Motion.
    Returns a list of dicts sorted chronologically (oldest to newest).
    """
    base_price = MOCK_BASE_PRICES.get(symbol, MOCK_BASE_PRICES["DEFAULT"])
    
    # Parameters for Geometric Brownian Motion
    mu = 0.05 / 252  # Drift (daily scale, converted)
    sigma = 0.25 / np.sqrt(252) # Volatility
    
    # Adjust parameters depending on the interval resolution
    if interval == "5min":
        dt = 1 / (78 * 252)  # 78 five-minute bars per day
        mu = mu * 0.1
        sigma = sigma * 0.15
    elif interval == "1h":
        dt = 1 / (6.5 * 252)  # 6.5 hours per day
        mu = mu * 0.3
        sigma = sigma * 0.3
    else: # 1day
        dt = 1.0
        
    prices = [base_price]
    for _ in range(count - 1):
        # Random step
        epsilon = np.random.normal(0, 1)
        # GBM formula: S_t = S_{t-1} * exp((mu - 0.5 * sigma^2) * dt + sigma * epsilon * sqrt(dt))
        change = np.exp((mu - 0.5 * (sigma ** 2)) * dt + sigma * epsilon * np.sqrt(dt))
        next_price = prices[-1] * change
        prices.append(next_price)
        
    # Generate timestamps going backwards from now
    now = datetime.datetime.now()
    records = []
    
    # Delta mappings
    if interval == "5min":
        delta = datetime.timedelta(minutes=5)
    elif interval == "1h":
        delta = datetime.timedelta(hours=1)
    else: # 1day
        delta = datetime.timedelta(days=1)
        
    current_time = now
    # We construct the list backwards, then reverse it
    for i in range(count):
        # Format string for twelve data matches: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD
        if interval == "1day":
            time_str = current_time.strftime("%Y-%m-%d")
        else:
            time_str = current_time.strftime("%Y-%m-%d %H:%M:%S")
            
        records.append({
            "datetime": time_str,
            "close": round(float(prices[count - 1 - i]), 2)
        })
        
        # Go backwards, skipping weekends for daily interval
        current_time -= delta
        if interval == "1day":
            while current_time.weekday() >= 5: # 5 is Saturday, 6 is Sunday
                current_time -= delta
                
    # Reverse to return chronologically oldest -> newest
    records.reverse()
    return records

def fetch_stock_data(symbol: str, interval: str, outputsize: int, api_key: str = None) -> tuple:
    """
    Fetches stock data from Twelve Data or falls back to mock simulation.
    Returns (data, is_mocked)
    """
    if not api_key:
        api_key = os.getenv("TWELVE_DATA_API_KEY")
        
    if not api_key or api_key == "abcd":
        print("No Twelve Data API Key provided or placeholder used. Using simulation mode.")
        return generate_mock_data(symbol, interval, outputsize), True
        
    try:
        url = f"https://api.twelvedata.com/time_series?symbol={symbol}&interval={interval}&outputsize={outputsize}&apikey={api_key}"
        res = requests.get(url, timeout=7)
        if res.status_code != 200:
            print(f"API request failed with status code {res.status_code}. Using simulation.")
            return generate_mock_data(symbol, interval, outputsize), True
            
        data = res.json()
        
        # Check for error statuses, e.g. Rate Limit / Invalid Key
        if "status" in data and data["status"] == "error":
            print(f"Twelve Data API Error: {data.get('message')}. Using simulation.")
            return generate_mock_data(symbol, interval, outputsize), True
            
        if "values" not in data or len(data["values"]) == 0:
            print("No values returned from API. Using simulation.")
            return generate_mock_data(symbol, interval, outputsize), True
            
        # Format API values to match standard: List of {"datetime": ..., "close": ...}
        # API returns values sorted from newest to oldest. We want oldest to newest.
        raw_vals = data["values"]
        records = []
        for val in raw_vals:
            records.append({
                "datetime": val["datetime"],
                "close": float(val["close"])
            })
        records.reverse() # Sort oldest -> newest
        return records, False
        
    except Exception as e:
        print(f"Network error in fetch_stock_data: {e}. Using simulation.")
        return generate_mock_data(symbol, interval, outputsize), True
