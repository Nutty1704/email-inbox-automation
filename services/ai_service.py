import json
from typing import List
from google import genai
from models import Email, AISummaryResponse


class AIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = genai.Client()
    
    def summarize_emails(self, emails: List[Email]) -> AISummaryResponse:
        """
        Analyze emails using AI and return structured summary.
        
        Args:
            emails: List of Email objects to analyze
            
        Returns:
            AISummaryResponse with filtered and prioritized emails
        """
        if not emails:
            return self._empty_response()
        
        email_text = self._format_emails_for_ai(emails)
        prompt = self._get_prompt(email_text)
        
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            if not response or not response.text:
                raise Exception("Empty response from Gemini API")
            
            return self._parse_ai_response(response.text)
            
        except Exception as e:
            print(f"AI summarization failed: {e}")
            raise
    
    def _format_emails_for_ai(self, emails: List[Email]) -> str:
        """Format emails into text for AI analysis"""
        email_text = "Here are the recent emails to analyze:\n\n"
        for i, email in enumerate(emails, 1):
            email_text += f"--- Email {i} ---\n{email}\n"
        return email_text
    
    def _get_prompt(self, email_text: str) -> str:
        """Generate the AI prompt for email analysis"""
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
        "urgent_count": 1
        }}

        PRIORITY RULES:
        - Job interviews/offers = URGENT
        - Job application updates/rejections/recruiter messages = HIGH  
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
    
    def _parse_ai_response(self, response_text: str) -> AISummaryResponse:
        """Parse AI JSON response into structured format"""
        try:
            json_text = self._extract_json_from_response(response_text)
            ai_response_dict = json.loads(json_text)
            
            # Validate required fields
            required_fields = ['summary', 'emails', 'total_professional_emails', 'job_emails', 'urgent_count']
            missing_fields = [field for field in required_fields if field not in ai_response_dict]
            
            if missing_fields:
                raise ValueError(f"Missing required fields in AI response: {missing_fields}")
            
            # Create typed response
            ai_response: AISummaryResponse = {
                'summary': ai_response_dict.get('summary', ''),
                'emails': ai_response_dict.get('emails', []),
                'total_professional_emails': ai_response_dict.get('total_professional_emails', 0),
                'job_emails': ai_response_dict.get('job_emails', 0),
                'urgent_count': ai_response_dict.get('urgent_count', 0)
            }
            
            return ai_response
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}")
            print(f"Raw response: {response_text[:200]}...")
            raise Exception(f"Invalid JSON response from AI: {e}")
        except Exception as e:
            print(f"Error processing AI response: {e}")
            raise
    
    def _empty_response(self) -> AISummaryResponse:
        """Return empty response when no emails provided"""
        return {
            'summary': 'No emails to analyze',
            'emails': [],
            'total_professional_emails': 0,
            'job_emails': 0,
            'urgent_count': 0
        }
    
    def _extract_json_from_response(self, response_text: str) -> str:
        """Extract JSON from markdown code blocks or plain text"""
        text = response_text.strip()
        
        # Check if wrapped in markdown code blocks
        if text.startswith('```'):
            lines = text.split('\n')
            json_lines = []
            
            for line in lines:
                if not line.startswith('```'):
                    json_lines.append(line)
            
            return '\n'.join(json_lines).strip()
        
        # If not in code blocks, try to find JSON directly
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            return text[start_idx:end_idx+1]
        
        return text