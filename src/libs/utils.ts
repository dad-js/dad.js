import SteamUser from "steam-user";
import os from "os";
import crypto from "crypto";
import type { ConnectionInfo } from "../networking/networker";
import path from "path";
import { readFile } from "fs-extra";

export async function getSteamBuildId(appId: number) {
	return new Promise<number>((res) => {
		const su = new SteamUser();
		su.logOn({
			anonymous: true,
		});
		su.on("loggedOn", async () => {
			const productInfo = await su.getProductInfo([appId], [], true);
			res(parseInt(`${productInfo.apps[appId].appinfo.depots.branches.public.buildid}`));
		});
	});
}

export async function getDaDBuildVersion() {
	return (
		await (
			await fetch("http://cdn.darkanddarker.com/Dark%20and%20Darker/Build/BuildVersion.txt")
		).text()
	)
		.trim()
		.split("-")[0];
}

export function getMacAddress() {
	return (
		os.networkInterfaces()["Ethernet"]?.[0].mac.toUpperCase().replaceAll(":", "-") ??
		"XX-XX-XX-XX-XX-XX"
	);
}

export function generateHwids() {
	return [
		crypto.createHash("sha256").update(`${Math.random()}`).digest("hex"),
		crypto.createHash("sha256").update(`${Math.random()}`).digest("hex"),
		crypto.createHash("sha256").update(`${Math.random()}`).digest("hex"),
	];
}

export async function getServerInfo(): Promise<ConnectionInfo> {
	try {
		const response = await fetch("http://54.148.133.180:30000/dc/helloWorld", {
			headers: {
				"User-Agent":
					"DungeonCrawler/UE5-CL-0 (http-legacy) Windows/10.0.19045.1.256.64bit",
			},
		});

		const serverInfo = (await response.json()) as any;
		if (
			!serverInfo ||
			typeof serverInfo["ipAddress"] !== "string" ||
			typeof serverInfo["port"] !== "number" ||
			typeof serverInfo["remote"] !== "string"
		)
			throw new Error("Unable to parse ServerInfo");

		return serverInfo;
	} catch (error) {
		throw new Error("Failed to fetch server info");
	}
}

export async function loadDataTable(resourcePath: string) {
	return JSON.parse(
		await readFile(path.join(__dirname, `../../resources/${resourcePath}.json`), "utf-8"),
	)[0];
}
