export type Subscriber<T> = (value: T) => void;
export type Unsubscriber = () => void;
export type Updater<T> = (value: T) => T;
export type Invalidator<T> = (value?: T) => void;
export type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];
export type StartStopNotifier<T> = (store: Store<T>) => void | (() => void);

export interface Readable<T> {
	subscribe(run: Subscriber<T>, invalidate?: Invalidator<T>): Unsubscriber;
	value: T;
	changed: Promise<T>;
}

export interface Writable<T> extends Readable<T> {
	set(value: T): void;
	update(updater: Updater<T>): void;
}

export function safeNotEquals(a: any, b: any) {
	return a != a ? b == b : a !== b || (a && typeof a === "object") || typeof a === "function";
}

export function noop() {}

const subscriber_queue = [] as [SubscribeInvalidateTuple<any>, any][];
export class Store<T> implements Readable<T>, Writable<T> {
	#subscribers = new Set<SubscribeInvalidateTuple<T>>();
	#start: StartStopNotifier<T>;
	#stop?: Unsubscriber;
	#value: T;

	get value() {
		return this.#value;
	}

	set value(v: T) {
		this.set(v);
	}

	constructor(value?: T, start: StartStopNotifier<T> = noop) {
		this.#value = value!;
		this.#start = start;
	}

	set(value: T) {
		if (safeNotEquals(this.value, value)) {
			this.#value = value;
			if (this.#stop) {
				// store is ready
				const run_queue = !subscriber_queue.length;
				for (const subscriber of this.#subscribers) {
					subscriber[1]?.();
					subscriber_queue.push([subscriber, this.value]);
				}
				if (run_queue) {
					for (let i = 0; i < subscriber_queue.length; i++) {
						subscriber_queue[i][0][0](subscriber_queue[i][1]);
					}
					subscriber_queue.length = 0;
				}
			}
		}
	}

	update(fn: Updater<T>) {
		this.set(fn(this.value));
	}

	subscribe(run: Subscriber<T>, invalidate?: Invalidator<T>) {
		const subscriber = [run, invalidate] as SubscribeInvalidateTuple<T>;
		this.#subscribers.add(subscriber);
		if (this.#subscribers.size === 1) {
			this.#stop = this.#start(this) || noop;
		}
		run(this.#value);
		return () => {
			this.#subscribers.delete(subscriber);
			if (this.#subscribers.size === 0 && this.#stop) {
				this.#stop();
				this.#stop = undefined;
			}
		};
	}

	get changed() {
		return new Promise<T>((res) => {
			let receivedInitial = false;
			const unsub = this.subscribe((v) => {
				if (receivedInitial) {
					res(v);
					unsub();
				}
				receivedInitial = true;
			});
		});
	}

	derive<R>(deriveFn: (v: T) => Promise<R>, _default?: R): Readable<R> {
		return new Store<R>(_default, (s) => {
			return this.subscribe(async (v) => {
				s.set(await deriveFn(v));
			});
		});
	}
}
