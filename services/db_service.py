from supabase import create_client, Client
from typing import List, Optional
from datetime import datetime
from models import AISummaryResponse, EmailSummary

class DatabaseService:
    def __init__(self, url: str, key: str):
        self.supabase: Client = create_client(url, key)
        
    def save_summary_session(self, ai_response: AISummaryResponse, created_at: Optional[datetime]) -> int:
        """Save summary session and return session_id"""
        if not ai_response:
            raise ValueError('AI response is empty')
        
        
        session_data = {
            'total_professional_emails': ai_response.get('total_professional_emails', 0),
            'job_emails': ai_response.get('job_emails', 0),
            'urgent_count': ai_response.get('urgent_count', 0),
            'summary_text': ai_response.get('summary', '')
        }
        
        if created_at:
            session_data['created_at'] = created_at.isoformat()
        
        response = (
            self.supabase
            .table('summary_sessions')
            .insert(session_data)
            .execute()
        )
        
        if not response.data:
            raise Exception('Failed to create summary session')
        
        session_id = response.data[0]['id']
    
        self.cleanup_old_sessions()
        
        return session_id
    
    def save_email_summaries(self, session_id: int, emails: List[EmailSummary]):
        """Save individual email summaries"""
        for email in emails:
            response = (
                self.supabase
                .table('email_summaries')
                .insert({
                    **email,
                    'session_id': session_id
                })
                .execute()
            )
            
            if not response.data:
                raise Exception(f'Failed to save email: {email.get("subject", "Unknown")}')
    
    def cleanup_old_sessions(self):
        """Keep only 10 most recent sessions"""
        response = self.supabase.rpc('cleanup_old_sessions').execute()
        
        if not response:
            raise Exception('Failed to cleanup old sessions')
    
    def get_last_run_time(self) -> Optional[datetime]:
        """Get last script run timestamp"""
        response = (
            self.supabase
            .table('summary_sessions')
            .select('created_at')
            .order('created_at', desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )
        
        if not response:
            return None

        try:
            return datetime.fromisoformat(response.data['created_at'].replace('Z', '+00:00'))
        except ValueError as e:
            print(f"Failed to parse last run time: {e}")
            return None