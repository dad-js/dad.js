import type { PacketName, Payload } from "@dad-js/dad-api";
import { NetClient } from "./netClient";
import { NetServer } from "./netServer";

export interface ConnectionInfo {
	ipAddress: string;
	port: number;
	remote: string;
}

export type PacketDirection = "IN" | "OUT";

export interface Packet<Name extends PacketName = PacketName> {
	name: Name;
	data: Payload<Name>;
}

export interface DirectionalPacket<Name extends PacketName = PacketName> extends Packet<Name> {
	direction: PacketDirection;
}

export type Interceptor = (packetName: PacketName, payload: Uint8Array) => Promise<Uint8Array>;

export class Networker {
	public readonly client = new NetClient();
	public readonly server = new NetServer();
	#connectionInfo?: ConnectionInfo;

	onGameToServer: Interceptor = async (_, payload) => payload;
	onServerToGame: Interceptor = async (_, payload) => payload;

	async connect(info: ConnectionInfo) {
		this.#connectionInfo = info;
		await this.client.connect(info);
		this.client.on("message", async (name, payload) => {
			this.server.send(name, await this.onServerToGame(name, payload));
		});
	}

	listen(port: number) {
		if (!this.#connectionInfo) return;
		this.server.listen(port, this.#connectionInfo.remote);
		this.server.on("message", async (name, payload) => {
			this.client.send(name, await this.onGameToServer(name, payload));
		});
	}

	#bufferInitialMessage = (packetName: PacketName, payload: Uint8Array) => {
		this.server.addInitialMessage(packetName, payload);
	};

	startBufferingForGame() {
		this.client.on("message", this.#bufferInitialMessage);
	}

	stopBufferingForGame() {
		this.client.off("message", this.#bufferInitialMessage);
	}

	close() {
		// TODO
	}
}
