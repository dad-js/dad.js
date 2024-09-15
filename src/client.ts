import {
	generateHwids,
	getDaDBuildVersion,
	getMacAddress,
	getSteamBuildId,
	getServerInfo,
} from "./libs/utils";
import { API, type AccountLoginRes } from "@dad-js/dad-api";
import { merge } from "ts-deepmerge";
import { mapCharacterInfo, type CharacterInfo } from "./models/character";
import { Store } from "./libs/store";
import { LobbyModule } from "./modules/lobby";
import findFreePorts, { isFreePort } from "find-free-ports";
import { Networker, type ConnectionInfo } from "./networking/networker";
import { MarketplaceModule } from "./modules";

export const steamAppId = 2016590;

interface RequiredClientOptions {
	sessionTicket: string;
}

interface OptionalClientOptions {
	buildVersion: string;
	steamBuildId: number;
	macAddress: string;
	hwIds: string[];
	connectionInfo: ConnectionInfo;
	port: number;
}

async function getDefaulClientOptions(): Promise<OptionalClientOptions> {
	return {
		macAddress: getMacAddress(),
		buildVersion: await getDaDBuildVersion(),
		steamBuildId: await getSteamBuildId(steamAppId),
		hwIds: generateHwids(),
		connectionInfo: await getServerInfo(),
		port: 3000,
	};
}

export type ClientOptions = RequiredClientOptions & OptionalClientOptions;

export class Client {
	readonly networker = new Networker();
	readonly api = new API(this.networker.client);

	readonly isConnected = new Store<boolean>(false);
	readonly accountInfo = new Store<AccountLoginRes>();
	readonly characterList = new Store<CharacterInfo[]>();
	readonly selectedCharacter = new Store<CharacterInfo | undefined>();

	#aliveTimer: any;

	#lobby = new LobbyModule(this);
	#marketplace = new MarketplaceModule(this);

	private constructor(public readonly options: ClientOptions) {
		this.#addListeners();
	}

	static async create(opts: RequiredClientOptions & Partial<OptionalClientOptions>) {
		const options = merge(await getDefaulClientOptions(), opts as ClientOptions);
		if (!(await isFreePort(options.port))) {
			options.port = (await findFreePorts(1))[0];
		}
		return new Client(options);
	}

	// TODO unsubscribe on disconnect
	#addListeners() {
		this.api.packetCommand.onAliveReverseNot((p) => {
			this.api.packetCommand.sendAliveReverseReq({});
		});

		this.api.account.onAccountCharacterListRes(async (payload) => {
			this.characterList.value = await Promise.all(
				payload.characterList.map(mapCharacterInfo),
			);
		});

		this.api.account.onLobbyEnterRes(async (p) => {
			const result = await this.api.lobby.lobbyCharacterInfo({});
			this.selectedCharacter.value = this.characterList.value.find(
				(c) => c.id === result.characterDataBase?.characterId,
			);
		});

		this.api.lobby.onCharacterSelectEnterRes(async (p) => {
			this.selectedCharacter.value = undefined;
		});
	}

	async login() {
		await this.networker.connect(this.options.connectionInfo);
		this.networker.startBufferingForGame();

		const accountInfo = await this.api.account.accountLogin({
			loginId: this.options.sessionTicket,
			password: this.options.sessionTicket,
			ipAddress: this.options.connectionInfo.remote,
			steamBuildId: this.options.steamBuildId,
			hwIds: this.options.hwIds,
			macAddress: this.options.macAddress,
			platformId: 1, // 1 - Steam
			buildVersion: this.options.buildVersion,
		});
		if (accountInfo.Result !== 1) {
			throw new Error("Error logging in: " + accountInfo.Result);
		}
		this.accountInfo.value = accountInfo;

		this.#aliveTimer = setInterval(() => {
			this.api.packetCommand.sendAliveReq({});
		}, 30_000);

		await this.api.account.accountCharacterList({
			pageIndex: 1,
			pageCapacity: 100,
		});

		await this.characterList.changed;

		this.networker.listen(this.options.port);
		this.isConnected.value = true;

		await this.#lobby.init();
		await this.#marketplace.init();
	}

	disconnect() {
		this.networker.close();
		clearInterval(this.#aliveTimer);
		this.isConnected.value = false;
	}

	async selectCharacter(character: CharacterInfo) {
		if (!this.isConnected.value) {
			throw new Error("Not connected");
		}

		const result = await this.api.account.lobbyEnter({ characterId: character.id });
		if (result.result !== 1) {
			throw new Error("Error selecting character: " + result.result);
		}

		this.selectedCharacter.value = character;
		this.networker.stopBufferingForGame();
		await this.lobby.stash.changed;
	}

	get lobby() {
		if (!this.isConnected.value) {
			throw new Error("Not connected");
		}
		if (!this.selectedCharacter.value) {
			throw new Error("No character selected");
		}
		return this.#lobby;
	}

	get marketplace() {
		if (!this.isConnected.value) {
			throw new Error("Not connected");
		}
		if (!this.selectedCharacter.value) {
			throw new Error("No character selected");
		}
		return this.#marketplace;
	}
}
