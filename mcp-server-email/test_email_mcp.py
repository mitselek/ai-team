#!/usr/bin/env python3
"""
Test Email MCP Server

Run standalone tests without Claude Desktop.
"""

import asyncio
import json
from src.server import app, list_tools, call_tool


async def test_tools():
    """Test all email tools."""
    
    print("=== Listing Available Tools ===\n")
    tools = await list_tools()
    for tool in tools:
        print(f"Tool: {tool.name}")
        print(f"Description: {tool.description}")
        print(f"Schema: {json.dumps(tool.inputSchema, indent=2)}\n")
    
    print("\n=== Testing read_inbox ===\n")
    result = await call_tool("read_inbox", {
        "limit": 3,
        "unread_only": False
    })
    print(result[0].text)
    
    print("\n=== Testing search_emails ===\n")
    result = await call_tool("search_emails", {
        "query": "test",
        "limit": 5
    })
    print(result[0].text)
    
    # Uncomment to test sending (careful!)
    # print("\n=== Testing send_email ===\n")
    # result = await call_tool("send_email", {
    #     "to": "your-test-email@example.com",
    #     "subject": "MCP Test",
    #     "body": "This is a test from the Email MCP server"
    # })
    # print(result[0].text)


if __name__ == "__main__":
    print("Email MCP Server - Standalone Test\n")
    asyncio.run(test_tools())
