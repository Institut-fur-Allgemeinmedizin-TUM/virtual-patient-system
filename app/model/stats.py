from typing import List

from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    total_score: int

class LeaderboardResponse(BaseModel):
    case_id: str
    top_entries: List[LeaderboardEntry]