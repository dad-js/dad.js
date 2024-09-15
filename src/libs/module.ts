import type { Client } from "../client";

export abstract class Module {
	constructor(public readonly client: Client) {}

	abstract init(): Promise<void>;
}
