#!/usr/bin/env python3
"""
MCP Server: Email Management

Provides email reading and sending capabilities via Gmail API with OAuth2.
Designed for AI Team Post Office agents.
"""

import asyncio
import base64
import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("mcp-email")

# Configuration
CREDENTIALS_FILE = os.getenv("GMAIL_CREDENTIALS_FILE", "credentials.json")
TOKEN_FILE = os.getenv("GMAIL_TOKEN_FILE", "token.json")
SCOPES = os.getenv("GMAIL_SCOPES", "https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/gmail.send").split(",")
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
MAX_EMAILS = int(os.getenv("MAX_EMAILS_PER_REQUEST", "50"))

# Initialize MCP server
app = Server("mcp-email")

# Gmail service instance (cached)
_gmail_service = None


def get_gmail_service():
    """Authenticate and return Gmail API service."""
    global _gmail_service
    
    if _gmail_service:
        return _gmail_service
    
    creds = None
    base_path = Path(__file__).parent.parent
    token_path = base_path / TOKEN_FILE
    creds_path = base_path / CREDENTIALS_FILE
    
    # Load existing token
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    
    # Refresh or get new token
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            logger.info("Refreshing access token")
            creds.refresh(Request())
        else:
            if not creds_path.exists():
                raise FileNotFoundError(
                    f"credentials.json not found at {creds_path}\n"
                    "Download from Google Cloud Console: https://console.cloud.google.com/apis/credentials"
                )
            
            logger.info("Starting OAuth2 flow")
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save token
        token_path.write_text(creds.to_json())
        logger.info(f"Token saved to {token_path}")
    
    _gmail_service = build('gmail', 'v1', credentials=creds)
    logger.info("Gmail API service initialized")
    return _gmail_service


def parse_gmail_message(msg: dict) -> dict[str, Any]:
    """Parse Gmail API message into structured dict."""
    headers = {h['name']: h['value'] for h in msg['payload']['headers']}
    
    # Extract body
    body = ""
    if 'parts' in msg['payload']:
        for part in msg['payload']['parts']:
            if part['mimeType'] == 'text/plain':
                body = base64.urlsafe_b64decode(part['body']['data']).decode()
                break
    elif 'body' in msg['payload'] and 'data' in msg['payload']['body']:
        body = base64.urlsafe_b64decode(msg['payload']['body']['data']).decode()
    
    return {
        "id": msg['id'],
        "from": headers.get('From', ''),
        "to": headers.get('To', ''),
        "subject": headers.get('Subject', ''),
        "date": headers.get('Date', ''),
        "body": body.strip()
    }


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available email tools."""
    return [
        Tool(
            name="send_email",
            description="Send an email to one or more recipients",
            inputSchema={
                "type": "object",
                "properties": {
                    "to": {
                        "type": "string",
                        "description": "Recipient email address (or comma-separated list)"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject line"
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body (plain text)"
                    }
                },
                "required": ["to", "subject", "body"]
            }
        ),
        Tool(
            name="read_inbox",
            description="Read recent emails from inbox",
            inputSchema={
                "type": "object",
                "properties": {
                    "mailbox": {
                        "type": "string",
                        "description": "Mailbox to read from (default: INBOX)",
                        "default": "INBOX"
                    },
                    "limit": {
                        "type": "integer",
                        "description": f"Number of emails to retrieve (max {MAX_EMAILS})",
                        "default": 10
                    },
                    "unread_only": {
                        "type": "boolean",
                        "description": "Only fetch unread emails",
                        "default": False
                    }
                }
            }
        ),
        Tool(
            name="search_emails",
            description="Search emails by criteria",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (subject, from, or text)"
                    },
                    "mailbox": {
                        "type": "string",
                        "description": "Mailbox to search (default: INBOX)",
                        "default": "INBOX"
                    },
                    "limit": {
                        "type": "integer",
                        "description": f"Max results (max {MAX_EMAILS})",
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="mark_as_read",
            description="Mark specific emails as read by subject",
            inputSchema={
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "description": "Subject line of emails to mark as read"
                    },
                    "mailbox": {
                        "type": "string",
                        "description": "Mailbox containing the emails",
                        "default": "INBOX"
                    }
                },
                "required": ["subject"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle tool execution."""
    
    if name == "send_email":
        return await send_email_tool(arguments)
    elif name == "read_inbox":
        return await read_inbox_tool(arguments)
    elif name == "search_emails":
        return await search_emails_tool(arguments)
    elif name == "mark_as_read":
        return await mark_as_read_tool(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")


async def send_email_tool(args: dict[str, Any]) -> list[TextContent]:
    """Send an email via Gmail API."""
    to = args["to"]
    subject = args["subject"]
    body = args["body"]
    
    logger.info(f"Sending email to: {to}")
    
    try:
        service = get_gmail_service()
        
        # Create message
        msg = MIMEMultipart()
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        
        # Encode and send
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        message = {'raw': raw}
        service.users().messages().send(userId='me', body=message).execute()
        
        logger.info(f"Email sent successfully to {to}")
        return [TextContent(
            type="text",
            text=f"Email sent successfully to {to}\nSubject: {subject}"
        )]
        
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return [TextContent(
            type="text",
            text=f"[ERROR] Failed to send email: {str(e)}"
        )]


async def read_inbox_tool(args: dict[str, Any]) -> list[TextContent]:
    """Read emails from inbox via Gmail API."""
    mailbox = args.get("mailbox", "INBOX")
    limit = min(args.get("limit", 10), MAX_EMAILS)
    unread_only = args.get("unread_only", False)
    
    logger.info(f"Reading {limit} emails from {mailbox} (unread_only={unread_only})")
    
    try:
        service = get_gmail_service()
        
        # Build query
        query = f"in:{mailbox.lower()}"
        if unread_only:
            query += " is:unread"
        
        # List messages
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=limit
        ).execute()
        
        messages = results.get('messages', [])
        if not messages:
            return [TextContent(type="text", text="No emails found")]
        
        # Fetch full message details
        emails = []
        for msg in messages:
            full_msg = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='full'
            ).execute()
            emails.append(parse_gmail_message(full_msg))
        
        # Format response
        result = f"Found {len(emails)} email(s):\n\n"
        for i, e in enumerate(emails, 1):
            result += f"--- Email {i} ---\n"
            result += f"From: {e['from']}\n"
            result += f"Subject: {e['subject']}\n"
            result += f"Date: {e['date']}\n"
            result += f"Body:\n{e['body'][:200]}...\n\n"
        
        return [TextContent(type="text", text=result)]
        
    except Exception as e:
        logger.error(f"Failed to read inbox: {e}")
        return [TextContent(
            type="text",
            text=f"[ERROR] Failed to read inbox: {str(e)}"
        )]


async def search_emails_tool(args: dict[str, Any]) -> list[TextContent]:
    """Search emails by query via Gmail API."""
    query = args["query"]
    mailbox = args.get("mailbox", "INBOX")
    limit = min(args.get("limit", 10), MAX_EMAILS)
    
    logger.info(f"Searching '{query}' in {mailbox}")
    
    try:
        service = get_gmail_service()
        
        # Build query (Gmail API search syntax)
        search_query = f"in:{mailbox.lower()} subject:{query}"
        
        # Search messages
        results = service.users().messages().list(
            userId='me',
            q=search_query,
            maxResults=limit
        ).execute()
        
        messages = results.get('messages', [])
        if not messages:
            return [TextContent(type="text", text=f"No emails found matching '{query}'")]
        
        # Fetch details
        emails = []
        for msg in messages:
            full_msg = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='full'
            ).execute()
            emails.append(parse_gmail_message(full_msg))
        
        # Format response
        result = f"Found {len(emails)} email(s) matching '{query}':\n\n"
        for i, e in enumerate(emails, 1):
            result += f"--- Email {i} ---\n"
            result += f"From: {e['from']}\n"
            result += f"Subject: {e['subject']}\n"
            result += f"Date: {e['date']}\n\n"
        
        return [TextContent(type="text", text=result)]
        
    except Exception as e:
        logger.error(f"Failed to search emails: {e}")
        return [TextContent(
            type="text",
            text=f"[ERROR] Failed to search: {str(e)}"
        )]


async def mark_as_read_tool(args: dict[str, Any]) -> list[TextContent]:
    """Mark emails as read via Gmail API."""
    subject = args["subject"]
    mailbox = args.get("mailbox", "INBOX")
    
    logger.info(f"Marking emails with subject '{subject}' as read")
    
    try:
        service = get_gmail_service()
        
        # Search for unread emails with subject
        query = f"in:{mailbox.lower()} is:unread subject:{subject}"
        results = service.users().messages().list(userId='me', q=query).execute()
        
        messages = results.get('messages', [])
        if not messages:
            return [TextContent(type="text", text=f"No unread emails found with subject '{subject}'")]
        
        # Mark as read by removing UNREAD label
        for msg in messages:
            service.users().messages().modify(
                userId='me',
                id=msg['id'],
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
        
        return [TextContent(
            type="text",
            text=f"Marked {len(messages)} email(s) as read"
        )]
        
    except Exception as e:
        logger.error(f"Failed to mark as read: {e}")
        return [TextContent(
            type="text",
            text=f"[ERROR] Failed to mark as read: {str(e)}"
        )]


async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        logger.info("Email MCP server starting...")
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
