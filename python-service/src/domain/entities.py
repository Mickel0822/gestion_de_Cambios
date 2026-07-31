from datetime import datetime


class Job:
    def __init__(
        self,
        id: int | None,
        text: str,
        status: str = "PENDIENTE",
        sentiment: str | None = None,
        keywords: str | None = None,
        error_message: str | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
    ):
        self.id = id
        self.text = text
        self.status = status
        self.sentiment = sentiment
        self.keywords = keywords
        self.error_message = error_message
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or self.created_at

    def to_dict(self) -> dict:
        def iso_timestamp(value):
            if not value:
                return None
            suffix = 'Z' if value.tzinfo is None else ''
            return f'{value.isoformat()}{suffix}'

        return {
            'id': self.id,
            'text': self.text,
            'status': self.status,
            'sentiment': self.sentiment,
            'keywords': [keyword.strip() for keyword in self.keywords.split(',')] if self.keywords else [],
            'error_message': self.error_message,
            'created_at': iso_timestamp(self.created_at),
            'updated_at': iso_timestamp(self.updated_at),
        }
