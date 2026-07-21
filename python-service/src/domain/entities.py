from datetime import datetime
from typing import Optional

class Job:
    def __init__(
        self,
        id: Optional[int],
        text: str,
        status: str = "PENDIENTE",
        sentiment: Optional[str] = None,
        keywords: Optional[str] = None,
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.text = text
        self.status = status
        self.sentiment = sentiment
        self.keywords = keywords
        self.created_at = created_at or datetime.now()

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'text': self.text,
            'status': self.status,
            'sentiment': self.sentiment,
            'keywords': [k.strip() for k in self.keywords.split(',')] if self.keywords else [],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
