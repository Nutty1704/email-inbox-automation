import imaplib
import email
from email.message import Message as EmailMessage
from email.header import decode_header
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from models import Email


class EmailService:
    def __init__(self, email_address: str, password: str):
        self.email_address = email_address
        self.password = password
        self.mail: Optional[imaplib.IMAP4_SSL] = None
        
    
    @staticmethod
    def get_default_since_time(hours_back: int = 8) -> datetime:
        """
        Utility function to get a default timestamp for when last_run is not available.
        
        Args:
            hours_back: How many hours back to look (default: 24 hours)
        
        Returns:
            datetime object for the specified time ago
        """
        return datetime.now() - timedelta(hours=hours_back)
    
    def connect(self) -> bool:
        """Connect to Gmail IMAP server. Returns True if successful."""
        try:
            if not self.email_address or not self.password:
                raise ValueError("Email credentials not found")
            
            self.mail = imaplib.IMAP4_SSL('imap.gmail.com')
            self.mail.login(self.email_address, self.password)
            print("Connected to mail server")
            return True
        except Exception as e:
            print(f"Connection failed: {e}")
            self.mail = None
            return False
    
    def disconnect(self):
        """Safely disconnect from mail server"""
        if self.mail:
            try:
                self.mail.logout()
                print("Disconnected from mail server")
            except Exception:
                pass
            finally:
                self.mail = None
    
    def get_emails_since(self, since: datetime, max_emails: int = 50) -> List[Email]:
        """
        Fetch emails received since given timestamp.
        Stops when it finds an email older than since.
        """
        if not self.mail:
            raise ConnectionError("Not connected to mail server")
        
        self.mail.select('INBOX')
        status, email_ids = self.mail.search(None, 'ALL')
        
        if status != 'OK':
            return []
        
        all_ids = email_ids[0].decode('utf-8').split()
        
        emails = []
        i = -1
        while i >= -len(all_ids) and i >= -max_emails:
            email_id = all_ids[i]
            email_obj = self._get_email(email_id)
            if email_obj and email_obj.date:
                if email_obj.date >= since:
                    emails.append(email_obj)
                else:
                    break
            i -= 1
        
        return emails
    
    def _get_email(self, email_id: str) -> Optional[Email]:
        """Extract email objects from list of email IDs"""
        if not self.mail:
            raise ConnectionError("Not connected to mail server")
        
        try:
            status, email_data = self.mail.fetch(email_id, '(RFC822)')
            if status == 'OK':
                email_message = self._get_email_message(email_data)
                body = self._get_email_body(email_message)
                
                email_obj = Email(
                    sender=self._decode_mime_words(email_message['From']),
                    subject=self._decode_mime_words(email_message['Subject']),
                    date=self._parse_email_date(email_message['Date']),
                    body=body[:500]
                )
                
                return email_obj
        except Exception as e:
            print(f"Failed to extract email {email_id}: {e}")
            
        return None
            
    def _parse_email_date(self, date_string: str) -> Optional[datetime]:
        """Parse email date string into datetime object"""
        if not date_string:
            return None
        
        try:
            return email.utils.parsedate_to_datetime(date_string)
        except Exception as e:
            print(f"Failed to parse email date: {e}")
            return None
    
    def _get_email_message(self, email_data: Tuple) -> EmailMessage:
        """Convert raw email data to email.Message object"""
        raw_email = email_data[0][1]
        return email.message_from_bytes(raw_email)
    
    def _get_email_body(self, email_message: EmailMessage) -> str:
        """Extract text body from email message"""
        body = ""
        
        try:
            if email_message.is_multipart():
                for part in email_message.walk():
                    if part.get_content_type() == "text/plain":
                        payload = part.get_payload(decode=True)
                        if payload:
                            body = payload.decode('utf-8', errors='ignore')
                            break
            else:
                payload = email_message.get_payload(decode=True)
                if payload:
                    body = payload.decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"Failed to extract email body: {e}")
            body = ""
        
        return body
    
    def _decode_mime_words(self, s: str) -> str:
        """Decode MIME-encoded email headers"""
        if not s:
            return ""
        
        try:
            decoded_words = decode_header(s)
            decoded_string = ""
            
            for word, encoding in decoded_words:
                if isinstance(word, bytes):
                    word = word.decode(encoding or 'utf-8', errors='ignore')
                decoded_string += word
            
            return decoded_string
        except Exception as e:
            print(f"Failed to decode MIME words: {e}")
            return s
    
    def __enter__(self):
        """Context manager entry"""
        if self.connect():
            return self
        raise ConnectionError("Failed to connect to email server")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()