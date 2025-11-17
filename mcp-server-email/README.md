# MCP Server: Email Management

Email reading and sending capabilities for AI agents via IMAP/SMTP.

## Features

- **Send Email**: Send emails to one or more recipients
- **Read Inbox**: Fetch recent emails (all or unread only)
- **Search Emails**: Search by subject/sender
- **Mark as Read**: Mark specific emails as read

## Setup

### 1. Install Dependencies

```bash
cd mcp-server-email
pip install -e .
```

### 2. Create Google Cloud Project & Enable Gmail API

1. Go to <https://console.cloud.google.com/>
2. Create new project or select existing
3. Enable Gmail API: <https://console.cloud.google.com/apis/library/gmail.googleapis.com>
4. Create OAuth 2.0 credentials:
   - Go to APIs & Services → Credentials
   - Create OAuth client ID → Desktop app
   - Download JSON and save as `credentials.json` in `mcp-server-email/`

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
EMAIL_ADDRESS=your-email@gmail.com
GMAIL_CREDENTIALS_FILE=credentials.json
GMAIL_TOKEN_FILE=token.json
```

### 4. First-Time OAuth Authorization

Run the test script to complete OAuth flow:

```bash
python test_email_mcp.py
```

This will:

- Open browser for Google login
- Request Gmail permissions
- Save token to `token.json` (auto-refreshes after)

### 5. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "email": {
      "command": "python",
      "args": ["/absolute/path/to/mcp-server-email/src/server.py"]
    }
  }
}
```

### 6. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

## Usage in Claude Desktop

### Send Email

```text
Use the send_email tool to send an email to test@example.com with subject "Hello" and body "This is a test"
```

### Read Inbox

```text
Use read_inbox to show me my 5 most recent emails
```

### Search Emails

```text
Search for emails with "invoice" in the subject
```

### Mark as Read

```text
Mark all emails with subject "Daily Report" as read
```

## Testing with Python

See `test_email_mcp.py` for standalone testing:

```bash
python test_email_mcp.py
```

## Security Notes

- OAuth2 tokens auto-refresh (more secure than passwords)
- `credentials.json` and `token.json` in `.gitignore` (never commit)
- Scopes limited to gmail.modify and gmail.send
- Tokens can be revoked at <https://myaccount.google.com/permissions>
- Consider rate limiting for production use

## AI Team Integration

This server is designed for the **Post Office Team** in AI Team:

- **Postmaster**: Uses all tools for email management
- **Notifier**: Uses `send_email` for notifications
- **Archivist**: Uses `read_inbox` and `mark_as_read` for processing

Integration layer coming in Phase 5.
