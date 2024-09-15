import {
	getPacketId,
	getPacketName,
	type PacketId,
	type PacketName,
	type Payload,
} from "@dad-js/dad-api";
import type { ConnectionInfo, Packet } from "./networker";
import { Socket } from "net";
import EventEmitter from "events";
import { MessageSocket } from "./messageSocket";

export type NetClientEventMap = Record<PacketName, [Uint8Array]> & {
	message: [PacketName, Uint8Array];
	connected: [ConnectionInfo];
	close: [];
};

export class NetClient extends EventEmitter<NetClientEventMap> {
	#socket?: MessageSocket;
	#isConnected = false;
	#connectionInfo?: ConnectionInfo;

	get isConnected() {
		return this.#isConnected;
	}

	get connectionInfo() {
		return this.#connectionInfo;
	}

	close() {
		this.#socket?.socket.destroy();
		this.#socket = undefined;
		this.#isConnected = false;
		this.#connectionInfo = undefined;
		this.emit("close");
	}

	async connect(connectionInfo: ConnectionInfo) {
		if (this.#socket || this.#isConnected) {
			throw new Error("Socket already connected");
		}

		return new Promise<void>((res) => {
			const socket = new Socket();
			socket.connect(connectionInfo.port, connectionInfo.ipAddress, () => {
				this.#socket = new MessageSocket(socket);
				this.#socket.on("message", (b) => this.#onMessage(b));
				this.#isConnected = true;
				this.#connectionInfo = connectionInfo;
				this.emit("connected", connectionInfo);
				res();
			});
		});
	}

	#onMessage(msg: Buffer) {
		const command = getPacketName(msg.readUInt16LE() as PacketId);
		const payload = Uint8Array.from(msg.subarray(4));
		this.emit(command, payload);
		this.emit("message", command, payload);
	}

	send(command: PacketName, payload: Uint8Array) {
		if (!this.#socket || !this.#isConnected) {
			return;
		}

		const cmdBuffer = Buffer.allocUnsafe(4);
		cmdBuffer.writeUInt32LE(getPacketId(command));

		const buffer = Buffer.concat([cmdBuffer, payload]);

		this.#socket.send(buffer);
	}
}
