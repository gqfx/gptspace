import { homedir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import { realpath } from "node:fs/promises";

export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export function expandHomePath(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/") || path.startsWith("~\\")) {
    return resolve(homedir(), path.slice(2));
  }

  return path;
}

export function isPathInsideRoot(path: string, root: string): boolean {
  const resolvedPath = resolve(expandHomePath(path));
  const resolvedRoot = resolve(expandHomePath(root));
  const relationship = relative(resolvedRoot, resolvedPath);

  return (
    relationship === "" ||
    (!relationship.startsWith("..") && relationship !== ".." && !relationship.includes(`..${sep}`))
  );
}

export function assertAllowedPath(path: string, allowedRoots: string[]): string {
  const resolvedPath = resolve(expandHomePath(path));
  if (allowedRoots.some((root) => isPathInsideRoot(resolvedPath, root))) {
    return resolvedPath;
  }

  throw new AccessDeniedError(outsideAllowedRootsMessage(path, allowedRoots));
}

export async function assertExistingPath(path: string, allowedRoots: string[]): Promise<string> {
  const resolvedPath = assertAllowedPath(path, allowedRoots);
  const finalPath = await realpath(resolvedPath);
  if (await isFinalPathAllowed(finalPath, allowedRoots)) return finalPath;

  throw new AccessDeniedError(outsideAllowedRootsMessage(path, allowedRoots));
}

export async function assertWritablePath(path: string, allowedRoots: string[]): Promise<string> {
  const resolvedPath = assertAllowedPath(path, allowedRoots);
  const existingParent = await findExistingParent(resolvedPath);
  const finalParent = await realpath(existingParent);
  if (await isFinalPathAllowed(finalParent, allowedRoots)) return resolvedPath;

  throw new AccessDeniedError(outsideAllowedRootsMessage(path, allowedRoots));
}

export function resolveAllowedPath(inputPath: string, cwd: string, allowedRoots: string[]): string {
  const absolutePath = resolve(cwd, inputPath);
  return assertAllowedPath(absolutePath, allowedRoots);
}

export async function resolveExistingPath(inputPath: string, cwd: string, allowedRoots: string[]): Promise<string> {
  const absolutePath = resolve(cwd, inputPath);
  return assertExistingPath(absolutePath, allowedRoots);
}

export async function resolveWritablePath(inputPath: string, cwd: string, allowedRoots: string[]): Promise<string> {
  const absolutePath = resolve(cwd, inputPath);
  return assertWritablePath(absolutePath, allowedRoots);
}

async function isFinalPathAllowed(path: string, allowedRoots: string[]): Promise<boolean> {
  const finalRoots = await Promise.all(
    allowedRoots.map(async (root) => {
      const resolvedRoot = resolve(expandHomePath(root));
      return realpath(resolvedRoot).catch(() => resolvedRoot);
    }),
  );

  return finalRoots.some((root) => isPathInsideRoot(path, root));
}

async function findExistingParent(path: string): Promise<string> {
  let current = dirname(resolve(path));

  while (true) {
    try {
      await realpath(current);
      return current;
    } catch (error) {
      if (!isPathNotFound(error)) throw error;
      const parent = dirname(current);
      if (parent === current) return current;
      current = parent;
    }
  }
}

function isPathNotFound(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT",
  );
}

function outsideAllowedRootsMessage(path: string, allowedRoots: string[]): string {
  return `Path is outside allowed roots: ${path}. Allowed roots: ${formatAllowedRoots(allowedRoots)}`;
}

function formatAllowedRoots(allowedRoots: string[]): string {
  return allowedRoots.length > 0 ? allowedRoots.join(", ") : "(none)";
}
