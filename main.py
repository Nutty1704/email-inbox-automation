import os
import logging
from dotenv import load_dotenv
from datetime import datetime, timezone
from services.email_service import EmailService
from services.ai_service import AIService
from services.db_service import DatabaseService


def main():
    """Main function to orchestrate email fetching, AI analysis, and database storage."""
    
    # Load environment variables
    load_dotenv()
    
    # Get credentials from environment
    email_address = os.getenv('GMAIL_USERNAME')
    password = os.getenv('GMAIL_PASSWORD')
    gemini_key = os.getenv('GEMINI_API_KEY')
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    # Set up logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)
    
    if not all([email_address, password, gemini_key, supabase_url, supabase_key]):
        logger.info("Missing required environment variables")
        # print("Required: GMAIL_USERNAME, GMAIL_PASSWORD, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY")
        return
    

    # Initialize services
    email_service = EmailService(email_address, password)
    ai_service = AIService(gemini_key)
    db_service = DatabaseService(supabase_url, supabase_key)
    
    try:        
        # Connect to email and process
        with email_service as mail_service:
            last_run = (
                db_service.get_last_run_time()
                or EmailService.get_default_since_time()
            )
            
            logger.info(f"Fetching emails since: {last_run}")
            
            fetch_time = datetime.now(timezone.utc)
            # Fetch emails since the timestamp
            emails = mail_service.get_emails_since(since=last_run)
            
            if not emails:
                # print("No emails could be processed")
                return
            
            logger.info(f"Successfully processed {len(emails)} emails")
                        
            # AI analysis
            # print("Analyzing emails with AI...")
            summary = ai_service.summarize_emails(emails)
            
            # print(f"AI found {summary['total_professional_emails']} professional emails")
            # print(f"Job-related: {summary['job_emails']}")
            # print(f"Urgent: {summary['urgent_count']}")
            
            # Save to database
            # print("Saving to database...")
            session_id = db_service.save_summary_session(summary, fetch_time)
            db_service.save_email_summaries(session_id, summary['emails'])

            logger.info("Finished all processing")
            
    except Exception as e:
        print(f"Error during processing: {e}")
        return


if __name__ == "__main__":
    main()