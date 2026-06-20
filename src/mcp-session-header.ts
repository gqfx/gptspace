import express from "express";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const MCP_SESSION_ID_HEADER = "mcp-session-id";
const INSTALLED = Symbol.for("devspace.mcpSessionHeaderShimInstalled");
type HeaderFunction = typeof express.request.header;
type PatchedRequestPrototype = typeof express.request & {
  [INSTALLED]?: boolean;
};

installMcpSessionHeaderShim();

function installMcpSessionHeaderShim(): void {
  const requestPrototype = express.request as PatchedRequestPrototype;
  if (requestPrototype[INSTALLED]) return;

  const originalHeader = requestPrototype.header as HeaderFunction;
  requestPrototype.header = function patchedHeader(this: express.Request, name: string): string | undefined {
    if (shouldHideStaleSessionHeader(this, name)) return undefined;
    return originalHeader.call(this, name);
  } as HeaderFunction;

  Object.defineProperty(requestPrototype, INSTALLED, {
    value: true,
    enumerable: false,
  });
}

function shouldHideStaleSessionHeader(req: express.Request, name: string): boolean {
  return (
    name.toLowerCase() === MCP_SESSION_ID_HEADER &&
    req.method === "POST" &&
    isInitializeRequest(req.body)
  );
}
