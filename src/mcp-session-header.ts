import express from "express";
import type { Request } from "express";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const MCP_SESSION_ID_HEADER = "mcp-session-id";
const INSTALLED = "__devspaceMcpSessionHeaderShimInstalled";
type HeaderFunction = (name: string) => string | undefined;
type PatchedRequestPrototype = {
  header: HeaderFunction;
  [INSTALLED]?: boolean;
};

installMcpSessionHeaderShim();

function installMcpSessionHeaderShim(): void {
  const requestPrototype = express.request as unknown as PatchedRequestPrototype;
  if (requestPrototype[INSTALLED]) return;

  const originalHeader = requestPrototype.header;
  requestPrototype.header = function patchedHeader(this: Request, name: string): string | undefined {
    if (shouldHideStaleSessionHeader(this, name)) return undefined;
    return originalHeader.call(this, name);
  };

  Object.defineProperty(requestPrototype, INSTALLED, {
    value: true,
    enumerable: false,
  });
}

function shouldHideStaleSessionHeader(req: Request, name: string): boolean {
  return (
    name.toLowerCase() === MCP_SESSION_ID_HEADER &&
    req.method === "POST" &&
    isInitializeRequest(req.body)
  );
}
