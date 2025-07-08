
# 📧 AI Email Summarizer

Stay on top of job and professional emails with an AI-powered system that summarizes your inbox and sends real-time updates straight to Discord.

## ✨ Key Features

- **AI-Powered Filtering** – Uses Gemini AI to identify job-related and professional emails  
- **Smart Prioritization** – Labels emails as URGENT, HIGH, MEDIUM, or LOW  
- **Discord Notifications** – Get summaries and use slash commands directly in Discord  
- **Automated Scheduling** – Checks emails 3 times daily (10:30 AM, 3 PM, 8 PM)  
- **Trends & Analytics** – Track job email frequency, urgency, and more  

## 🧠 How It Works

Python Script  
&nbsp;&nbsp;&nbsp;↓ fetch, analyze emails with Gemini AI  
Supabase DB  
&nbsp;&nbsp;&nbsp;↕ store summaries & metadata  
Discord Bot  
&nbsp;&nbsp;&nbsp;↓ notify & interact in real-time  
User on Discord (DM)

## ⚙️ Setup Guide

### Prerequisites

- Python 3.8+, Node.js 16+  
- Gmail with App Password enabled  
- Supabase account  
- Discord Developer account  
- Google AI Studio (Gemini API Key)  

### 1. Clone & Configure

```bash
git clone https://github.com/Nutty1704/email-inbox-automation.git
cd email-inbox-automation
cp .env.sample .env
# Fill in your credentials in .env (email configuration, supabase configuration, gemini api key, etc)

cd ./discord_bot
cp .env.sample .env
# Fill in your credentials in .env for discord bot (token, user id, etc)
```

### 2. Gmail Setup

- Enable 2FA on Gmail  
- Create an [App Password](https://myaccount.google.com/apppasswords)  
- Add credentials to `.env`

### 3. Supabase Database Setup

```sql
-- Create summary sessions table
CREATE TABLE summary_sessions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_professional_emails INTEGER DEFAULT 0,
    job_emails INTEGER DEFAULT 0,
    urgent_count INTEGER DEFAULT 0,
    summary_text TEXT
);

-- Create email summaries table
CREATE TABLE email_summaries (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES summary_sessions(id) ON DELETE CASCADE,
    priority TEXT NOT NULL,
    category TEXT NOT NULL,
    company TEXT,
    type TEXT NOT NULL,
    subject TEXT,
    action_needed TEXT,
    sender TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable real-time for summary_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE summary_sessions;
```

Create the tables manually using SQL above or use Supabase Table Editor.

### 4. Install & Run Locally

```bash
# Python Email Processor
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# Discord Bot (start at root of repository)
cd ./discord_bot
npm install
node index.js
```

## 💬 Discord Commands

| Command                  | Description                          |
|--------------------------|------------------------------------|
| `/summary`               | Show all recent emails              |
| `/summary <priority>`    | Show emails filtered by priority (URGENT, HIGH, MEDIUM, LOW) |
| `/summary today`         | Show today's email summary          |
| `/summary job`           | Show job-related emails             |
| `/summary linkedin`      | Show LinkedIn update emails         |


## 🚀 Deployment

### Python Script (GitHub Actions)

Runs 3x/day via GitHub Actions.  
Set secrets → `GMAIL_USERNAME`, `GMAIL_PASSWORD`, `GEMINI_API_KEY`, etc.

### Discord Bot (Droplet on Digital Ocean)

- Deploy from `discord_bot/` directory  
- Add environment variables  
- Invite bot to your private server

## 🛠️ Customization

- **Commands** → Add new ones in `discord_bot/commands`  
- **AI Logic** → Adjust prompts in `services/ai_service.py`  
- **Database** → Update `models.py` if schema changes  

## 📄 License

MIT License – see [LICENSE](LICENSE)

---

**🌟 Found this useful? Star the repo to support the project!**
