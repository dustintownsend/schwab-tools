#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { authTools, handleAuthTool } from './tools/auth.js';
import { accountTools, handleAccountTool } from './tools/accounts.js';
import { marketDataTools, handleMarketDataTool } from './tools/market-data.js';
import { optionTools, handleOptionTool } from './tools/options.js';
import { orderTools, handleOrderTool } from './tools/orders.js';

// Combine all tools
const allTools = [
  ...authTools,
  ...accountTools,
  ...marketDataTools,
  ...optionTools,
  ...orderTools,
];

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  // Auth tools work even without full authentication
  if (authTools.some(t => t.name === name)) {
    const { SchwabTokenManager } = await import('@schwab-tools/core');
    const tokenManager = await SchwabTokenManager.create();
    return handleAuthTool(name, args, tokenManager);
  }

  // Effect-based tools handle their own service creation
  if (accountTools.some(t => t.name === name)) {
    return handleAccountTool(name, args);
  }

  if (marketDataTools.some(t => t.name === name)) {
    return handleMarketDataTool(name, args);
  }

  if (optionTools.some(t => t.name === name)) {
    return handleOptionTool(name, args);
  }

  if (orderTools.some(t => t.name === name)) {
    return handleOrderTool(name, args);
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function main() {
  const server = new Server(
    {
      name: 'schwab-tools',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools,
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleToolCall(name, args as Record<string, unknown> || {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (not stdout, which is used for MCP protocol)
  console.error('Schwab MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
