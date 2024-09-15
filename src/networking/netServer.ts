import EventEmitter from "events";
import findFreePorts from "find-free-ports";
import { type Server as HTTPServer, createServer as createHTTP } from "http";
import { type Server as TCPServer, createServer as createTCP } from "net";
import type { ConnectionInfo, Packet } from "./networker";
import { MessageSocket } from "./messageSocket";
import {
	encode,
	getPacketId,
	getPacketName,
	type PacketId,
	type PacketName,
} from "@dad-js/dad-api";

export type NetServerEventMap = Record<PacketName, [Uint8Array]> & {
	message: [PacketName, Uint8Array];
	connected: [];
	close: [];
};

export class NetServer extends EventEmitter<NetServerEventMap> {
	#httpServer?: HTTPServer;
	#server?: TCPServer;
	#socket?: MessageSocket;
	#initialMessages: [PacketName, Uint8Array][] = [];

	async listen(port: number, remote: string) {
		if (this.#server) return;

		const tcpPort = (await findFreePorts(1))[0];

		this.#httpServer = createHTTP((req, res) => {
			res.writeHead(200);
			res.end(
				JSON.stringify({
					ipAddress: "127.0.0.1",
					port: tcpPort,
					remote: remote ?? "127.0.0.1",
				}),
			);
		}).listen(port);

		this.#server = createTCP((s) => {
			this.emit("connected");
			this.#socket = new MessageSocket(s);

			for (const msg of this.#initialMessages) {
				this.send(msg[0], msg[1]);
			}

			this.#socket.on("message", (buffer) => this.#onMessage(buffer));
		});
		this.#server.listen(tcpPort);
	}

	#onMessage(msg: Buffer) {
		const command = getPacketName(msg.readUInt16LE() as PacketId);
		const payload = Uint8Array.from(msg.subarray(4));
		this.emit(command, payload);
		this.emit("message", command, payload);
	}

	send(command: PacketName, payload: Uint8Array) {
		if (!this.#socket) {
			return;
		}

		const cmdBuffer = Buffer.allocUnsafe(4);
		cmdBuffer.writeUInt32LE(getPacketId(command));

		const buffer = Buffer.concat([cmdBuffer, payload]);
		this.#socket.send(buffer);
	}

	addInitialMessage(packetName: PacketName, payload: Uint8Array) {
		this.#initialMessages.push([packetName, payload]);
	}
}
