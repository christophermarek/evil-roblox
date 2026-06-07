import { Flamework } from "@flamework/core";

/**
 * Client entry point. `.client.ts` compiles to a LocalScript that auto-runs.
 * Flamework scans these paths for @Controller classes, wires DI, then ignites lifecycles.
 */
Flamework.addPaths("src/client/controllers");

Flamework.ignite();
