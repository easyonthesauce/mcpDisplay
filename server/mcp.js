import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { handleMcpToolCall, getToolDefinitions } from "./http-mcp-handler.js";

function jsonResponse(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

export async function startMcpServer(onDisplayStateChanged) {
  const server = new Server(
    {
      name: "family-kiosk-display",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const publish = () => {
    onDisplayStateChanged?.();
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = getToolDefinitions().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties: {}
      }
    }));
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      const result = await handleMcpToolCall(name, args, publish);
      return jsonResponse(result);
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: false,
                error: error instanceof Error ? error.message : String(error)
              },
              null,
              2
            )
          }
        ]
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
