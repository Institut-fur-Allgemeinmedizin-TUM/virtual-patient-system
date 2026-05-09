# In-memory storage for VHB sessions (not persisted to database)
# Structure: {session_id: {"case_id": str, "messages": [{"role": str, "content": str}]}}
import logging
from typing import Dict

vhb_sessions: Dict[str, Dict] = {}
logger = logging.getLogger("uvicorn.info")