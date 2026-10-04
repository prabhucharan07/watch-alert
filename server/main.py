"""
Campus WiFi Watch System - FastAPI Server
Backend REST API for virtual smartwatch communication on local Wi-Fi / LAN.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI application
app = FastAPI(
    title="Campus WiFi Watch Server",
    description="Local LAN message broker linking Admin Watch and Student Watch prototypes",
    version="1.0.0"
)

# Enable CORS for all origins so standalone HTML files opened from browsers
# on any laptop/phone connected to the campus Wi-Fi can communicate seamlessly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for the latest message
latest_data = {
    "message": "Class has started"
}

# Request schema for admin message
class AdminMessage(BaseModel):
    message: str


@app.get("/")
def get_root():
    """
    Health check and server discovery endpoint.
    """
    return {
        "status": "online",
        "message": "Campus WiFi Watch Server is running"
    }


@app.post("/admin-message")
def post_admin_message(payload: AdminMessage):
    """
    Receive new campus alert message from Admin Watch and store in server memory.
    """
    global latest_data
    latest_data["message"] = payload.message
    return {
        "status": "success",
        "from": "admin",
        "message": payload.message
    }


@app.get("/admin-message")
def get_admin_message():
    """
    Polled by Student Watch devices approximately every 1 second to fetch the latest alert.
    """
    return {
        "message": latest_data["message"]
    }


if __name__ == "__main__":
    import uvicorn
    # Run server binding to all network interfaces on port 8000
    print("Starting Campus WiFi Watch Server on http://0.0.0.0:8000 ...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
