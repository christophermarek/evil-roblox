/**
 * Shared enums for Evil Robloxia.
 * Kept in `shared/` so server (authority) and client (rendering) agree on the same
 * vocabulary for roles, NPC states, and crimes.
 */

/** What an NPC does for a living — drives which schedule it follows. */
export enum Role {
	Resident = "Resident",
	Shopkeeper = "Shopkeeper",
	Teacher = "Teacher",
	Student = "Student",
	Cop = "Cop",
}

/** Finite-state-machine states for an NPC (see DESIGN §4 / BUILD_PLAN §A1). */
export enum NPCState {
	AtHome = "AtHome",
	Commuting = "Commuting",
	AtWork = "AtWork",
	Break = "Break",
	Leisure = "Leisure",
	Sleep = "Sleep",
	// reactive states (M4+)
	Suspicious = "Suspicious",
	Fleeing = "Fleeing",
	CallingPolice = "CallingPolice",
}

/** Kinds of node anchors placed in the town; the node graph is the map contract. */
export enum NodeKind {
	Home = "Home",
	Store = "Store",
	School = "School",
	Park = "Park",
	Work = "Work",
	Police = "Police",
	Bank = "Bank",
	Cafe = "Cafe",
}

/** Crime types (villain layer, M4+). Listed now so payouts can live in config. */
export enum CrimeType {
	Pickpocket = "Pickpocket",
	Burgle = "Burgle",
	RobStore = "RobStore",
	Hijack = "Hijack",
	Vandalism = "Vandalism",
}
