import type { Socket } from "net";
import { EventEmitter } from "stream";

export interface MessageSocketEventMap {
	read: [Buffer];
	write: [Buffer];
	message: [Buffer];
	send: [Buffer];
	flush: [];
}

export class MessageSocket extends EventEmitter<MessageSocketEventMap> {
	#incoming = Buffer.alloc(0);
	#outgoing = Buffer.alloc(0);
	#writing = false;

	constructor(public readonly socket: Socket) {
		super();

		const onData = (data: Buffer) => {
			this.#incoming = Buffer.concat([this.#incoming, data]);
			this.emit("read", data);

			while (this.#incoming.length >= 4) {
				const size = this.#incoming.readUInt32LE(0) - 4;
				if (this.#incoming.length < 4 + size) break;

				const message = this.#incoming.subarray(4, 4 + size);
				this.#incoming = this.#incoming.subarray(4 + size);
				this.emit("message", message);
			}
		};

		socket.on("data", onData);
	}

	send(payload: Buffer) {
		let message = Buffer.allocUnsafe(4 + payload.length);
		message.writeUInt32LE(payload.length + 4, 0);
		payload.copy(message, 4);
		this.#outgoing = Buffer.concat([this.#outgoing, message]);

		this.emit("send", payload);

		this.#write();
	}

	#write() {
		if (!this.#outgoing.length) {
			this.emit("flush");
			return;
		}

		this.#writing = true;
		const buffer = this.#outgoing.subarray();
		this.#outgoing = Buffer.alloc(0);

		this.emit("write", buffer);
		this.socket.write(buffer, undefined, () => {
			this.#writing = false;
			this.#write();
		});
	}
}
