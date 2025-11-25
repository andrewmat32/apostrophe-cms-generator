/**
 * MCP Client Bridge
 * Allows Express server to call MCP server tools
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let requestId = 1;

/**
 * Call an MCP tool
 */
export async function callMcpTool(toolName, args = {}) {
  const mcpServerPath = join(__dirname, '..', 'mcp-server', 'index.js');

  return new Promise((resolve, reject) => {
    const child = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let responded = false;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (responded) return;

      if (code !== 0) {
        reject(new Error(`MCP server failed (exit code ${code}): ${stderr}`));
      } else {
        try {
          // Parse all JSON-RPC responses (skip the "running" message)
          const lines = stdout.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const response = JSON.parse(line);

              // Skip if not a response to our request
              if (!response.result && !response.error) continue;

              if (response.error) {
                responded = true;
                reject(new Error(response.error.message || JSON.stringify(response.error)));
                return;
              }

              if (response.result) {
                responded = true;

                // Extract content from MCP response format
                if (response.result.content && response.result.content[0]) {
                  const content = response.result.content[0].text;
                  try {
                    const data = JSON.parse(content);
                    resolve(data);
                  } catch (parseError) {
                    console.error('=== JSON PARSE ERROR ===');
                    console.error('Failed to parse MCP response content');
                    console.error('Error:', parseError.message);
                    console.error('Content preview (first 500 chars):');
                    console.error(content.substring(0, 500));
                    console.error('=== END ERROR ===');
                    reject(new Error(`Failed to parse JSON: ${parseError.message}`));
                  }
                } else {
                  resolve(response.result);
                }
                return;
              }
            } catch (e) {
              // Skip non-JSON lines (like "MCP server running")
              continue;
            }
          }

          if (!responded) {
            reject(new Error('No valid response from MCP server'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse MCP response: ${error.message}`));
        }
      }
    });

    child.on('error', (error) => {
      if (!responded) {
        responded = true;
        reject(new Error(`Failed to spawn MCP server: ${error.message}`));
      }
    });

    // Send the JSON-RPC request
    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();
  });
}

/**
 * List available MCP tools
 */
export async function listMcpTools() {
  const mcpServerPath = join(__dirname, '..', 'mcp-server', 'index.js');

  return new Promise((resolve, reject) => {
    const child = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP server failed (exit code ${code}): ${stderr}`));
      } else {
        try {
          const lines = stdout.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const response = JSON.parse(line);

              if (response.result && response.result.tools) {
                resolve(response.result.tools);
                return;
              }
            } catch (e) {
              continue;
            }
          }

          reject(new Error('No tools list in MCP response'));
        } catch (error) {
          reject(new Error(`Failed to parse MCP response: ${error.message}`));
        }
      }
    });

    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'tools/list',
      params: {}
    };

    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();
  });
}
