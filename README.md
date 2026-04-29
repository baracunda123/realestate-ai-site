# Real Estate AI — Conversational Property Search

An AI-powered real estate platform that lets users find properties through natural language conversation. Instead of filling out filters, users simply describe what they're looking for — and the system recommends matching properties through a chat interface.

---

## What It Does

Users interact with a chat interface to search for properties using natural language:

> *"I'm looking for a 2-bedroom apartment in Lisbon under €1,500/month"*

The system:
- Understands the request using **OpenAI GPT**
- Recommends matching properties through a conversational response
- Lists the relevant properties visually on the page

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | C# |
| Frontend | TypeScript |
| Styling | CSS |
| AI | OpenAI GPT API |
| Interface | Web Application |

---

## Getting Started

### Prerequisites

- .NET SDK
- Node.js
- OpenAI API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/baracunda123/realestate-ai-site.git
cd realestate-ai-site

# Install frontend dependencies
npm install

# Add your OpenAI API key to appsettings.json
# appsettings.json is NOT included in this repository for security reasons
# Create your own appsettings.json with:
# {
#   "OpenAI": {
#     "ApiKey": "your_key_here"
#   }
# }
```

### Running the App

```bash
# Run the backend
dotnet run

# Run the frontend (in a separate terminal)
npm run dev
```


---

## How the AI Works

1. User sends a natural language message via the chat interface
2. The message is sent to the **OpenAI GPT API** with context about available properties
3. GPT interprets the request and identifies matching criteria
4. The system filters and ranks properties based on the AI response
5. Results are returned as a conversational reply + property listings

---

## Notes

This was a personal project built to explore LLM integration in a real-world web application context. The platform is no longer hosted live due to API costs, but the full source code is available here.

---

## Author

**Luís Ribeiro** — [GitHub](https://github.com/baracunda123)
