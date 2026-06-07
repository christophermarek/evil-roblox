import { Flamework } from "@flamework/core";

/**
 * Server entry point. `.server.ts` compiles to a Server Script that auto-runs.
 * Flamework scans these paths for @Service classes, wires DI, then ignites lifecycles.
 */
Flamework.addPaths("src/server/services");

Flamework.ignite();
