from typing import TypedDict, List
from datetime import datetime

class Email:
    def __init__(self, sender: str, subject: str, date: datetime, body: str) -> None:
        self.sender = sender
        self.subject = subject
        self.date = date
        self.body = body

    def __str__(self) -> str:
        email_text = ""
        email_text += f"From: {self.sender}\n"
        email_text += f"Subject: {self.subject}\n"
        email_text += f"Body: {self.body}"
        return email_text
    
    def __repr__(self) -> str:
        return f"Email(sender='{self.sender[:30]}...', subject='{self.subject[:30]}...')"
    

class EmailSummary(TypedDict):
    priority: str
    category: str
    company: str
    type: str
    subject: str
    action_needed: str
    sender: str
    

class AISummaryResponse(TypedDict):
    summary: str
    emails: List[EmailSummary]
    total_professional_emails: int
    job_emails: int
    urgent_count: int