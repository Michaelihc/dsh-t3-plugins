// Entry for the stdio MCP bridge an ACP agent starts when it lacks HTTP MCP. It runs T3's own
// bridge (src/t3/mcp/AcpMcpStdioBridge.ts) with T3's T3_ACP_MCP_ENDPOINT and
// T3_ACP_MCP_AUTHORIZATION environment, as T3's `acp-mcp-bridge` command does.
import { runAcpMcpCliFastPath } from './t3/mcp/AcpMcpStdioBridge.ts'

await runAcpMcpCliFastPath('acp-mcp-bridge', [])
