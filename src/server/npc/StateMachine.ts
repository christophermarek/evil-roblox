/**
 * A tiny finite-state-machine (BUILD_PLAN §A1). Each state registers lifecycle hooks;
 * the machine drives onExit(old) → onEnter(new) on transition and onUpdate(current) per
 * tick. Generic over a state-key enum `S` and a shared context `C` (the NPC agent), so
 * the same machine serves schedule states now and reactive states (Fleeing, …) in M4.
 */
export interface StateHandlers<C> {
	onEnter?: (ctx: C) => void;
	onUpdate?: (ctx: C, dt: number) => void;
	onExit?: (ctx: C) => void;
}

export class StateMachine<S extends string, C> {
	private current?: S;
	private readonly handlers = new Map<S, StateHandlers<C>>();

	constructor(
		private readonly ctx: C,
		private readonly label: string,
	) {}

	addState(state: S, handlers: StateHandlers<C>): this {
		this.handlers.set(state, handlers);
		return this;
	}

	getState(): S | undefined {
		return this.current;
	}

	transition(to: S): void {
		if (this.current === to) return;
		const from = this.current;
		if (from !== undefined) this.handlers.get(from)?.onExit?.(this.ctx);
		this.current = to;
		print(`[FSM:${this.label}] ${from ?? "(start)"} → ${to}`);
		this.handlers.get(to)?.onEnter?.(this.ctx);
	}

	update(dt: number): void {
		if (this.current !== undefined) this.handlers.get(this.current)?.onUpdate?.(this.ctx, dt);
	}
}
