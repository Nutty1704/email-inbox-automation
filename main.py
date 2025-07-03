import imaplib
import os
import email
from email.header import decode_header
from dotenv import load_dotenv
from google import genai


class Email:
    def __init__(self, sender, subject, date, body) -> None:
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


def get_prompt(email_text: str) -> str:
    return f"""
    Analyze these emails and return ONLY relevant professional emails in this exact JSON format:

    {{
    "summary": "Brief overview of findings",
    "emails": [
        {{
        "priority": "URGENT|HIGH|MEDIUM|LOW",
        "category": "job|linkedin|professional",
        "company": "Company/platform name",
        "type": "interview|application|recruiter|update|rejection|connection|message|endorsement|job_alert",
        "subject": "Clean subject line", 
        "action_needed": "What I should do next",
        "sender": "sender name"
        }}
    ],
    "total_professional_emails": 5,
    "job_emails": 3,
    "linkedin_emails": 2,
    "urgent_count": 1
    }}

    PRIORITY RULES:
    - Job interviews/offers = URGENT
    - Job applications/recruiter messages = HIGH  
    - LinkedIn messages/connections = MEDIUM
    - LinkedIn job alerts/updates = LOW

    INCLUDE ONLY:
    - Job applications, interviews, recruiter outreach
    - LinkedIn connection requests, messages, endorsements
    - LinkedIn job alerts, profile views
    - Professional networking emails

    IGNORE COMPLETELY:
    - Shopping/promotional emails
    - Transaction receipts  
    - Newsletters (non-professional)
    - Social media (except LinkedIn)
    - Spam/marketing

    Emails:
    {email_text}
    """


def get_ai_summary(emails: list[Email]) -> str:
    client = genai.Client()

    email_text = "Here are the recent emails to analyze:\n\n"
    for i, em in enumerate(emails, 1):
        email_text += f"--- Email {i} ---\n{em}\n"

    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=get_prompt(email_text)
    )

    return response.text

def get_email_message(email_data: tuple) -> email.message.Message:
    raw_email = email_data[0][1]
    email_message = email.message_from_bytes(raw_email)
    return email_message

def get_email_body(email_message: email.message.Message) -> str:
    body = ""

    if email_message.is_multipart():
        for part in email_message.walk():
            if part.get_content_type() == "text/plain":
                body = part.get_payload(decode=True).decode('utf-8')
                break
    else:
        body = email_message.get_payload(decode=True).decode('utf-8')

    return body


def decode_mime_words(s: str) -> str:
    if not s:
        return ""

    decoded_words = decode_header(s)
    decoded_string = ""

    for word, encoding in decoded_words:
        if isinstance(word, bytes):
            word = word.decode(encoding or 'utf-8')
        
        decoded_string += word
    
    return decoded_string


def connect_to_mail() -> imaplib.IMAP4_SSL:
    try:
        email_address = os.getenv('GMAIL_USERNAME')
        password = os.getenv('GMAIL_PASSWORD')

        if not email_address or not password:
            raise ValueError("Credentials not found")
        
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(email_address, password)
        print("Connected to mail server")
        return mail
    except Exception as e:
        print(f"Connection failed: {e}")
        return None


def get_recent_email_ids(mail: imaplib.IMAP4_SSL, count=10) -> list[str]:
    mail.select('INBOX')
    status, email_ids = mail.search(None, 'ALL')
    
    if status == 'OK':
        ids_bytes = email_ids[0]
        ids = ids_bytes.decode('utf-8').split()
        return ids[-count:]
    return []


def extract_emails(mail: imaplib.IMAP4_SSL, email_ids: list[str]) -> list[Email]:
    emails = []
    for email_id in email_ids:
        status, email_data = mail.fetch(email_id, '(RFC822)')
        email_message = get_email_message(email_data)
        body = get_email_body(email_message)
        
        email_info = Email(
            decode_mime_words(email_message['From']),
            decode_mime_words(email_message['Subject']),
            email_message['Date'],
            body[:500]
        )
        emails.append(email_info)
    
    return emails


def main():
    mail = connect_to_mail()
    if not mail:
        print("Cannot proceed without a connection to the mail server.")
        return

    try:
        recent_ids = get_recent_email_ids(mail, 20)
        emails = extract_emails(mail, recent_ids)
        summary = get_ai_summary(emails)
        print(summary)
    except Exception as e:
        print(f"Error: {e}")
        return
    finally:
        mail.logout()


if __name__ == "__main__":
    load_dotenv()
    main()