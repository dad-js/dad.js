import { readFile } from "fs-extra";
import { readdir } from "fs/promises";
import path from "path";

import type { Unmessage } from "@dad-js/dad-api";
import { type SItem, type SItemProperty } from "@dad-js/dad-api/pb";
import { getItemData, mapItemInfo, type ItemData } from "../datatables";
import { getLocalizedString, type LanguageFile } from "./localization";

export interface ItemPosition {
	uid?: bigint;
	slot: number;
	inventory: number;
}

export const mapItem = async (item: Unmessage<SItem>) => ({
	uid: item.itemUniqueId,
	id: item.itemId,
	slot: item.slotId,
	inventory: item.inventoryId,
	count: item.itemCount,
	ammo: item.itemAmmoCount,
	contents: item.itemContentsCount,
	lootState: item.lootState,
	primaryProperties: item.primaryPropertyArray.map(mapItemProperty),
	secondaryProperties: item.secondaryPropertyArray.map(mapItemProperty),
	data: await getItemData(item.itemId),
});
export type Item = Awaited<ReturnType<typeof mapItem>>;

export const mapItemProperty = (prop: Unmessage<SItemProperty>) => ({
	type: prop.propertyTypeId,
	value: prop.propertyValue,
});
export type ItemProperties = ReturnType<typeof mapItemProperty>;

export async function getItemNames(locale: LanguageFile) {
	const itemDictionary: string[] = [];

	const files = await readdir(path.join(__dirname, `../../resources/DT_Item/Item/`));

	for await (let file of files) {
		const content = JSON.parse(
			await readFile(path.join(__dirname, `../../resources/DT_Item/Item/${file}`), "utf-8"),
		)[0];

		let itemName = await getLocalizedString(locale, content.Properties.Item.Name.Key);
		if (!itemDictionary.includes(itemName)) {
			itemDictionary.push(itemName);
		}
	}

	return itemDictionary;
}

export async function getAllItems() {
	const itemList: Map<string, Awaited<ItemData>> = new Map<string, Awaited<ItemData>>();
	const files = await readdir(path.join(__dirname, `../../resources/DT_Item/Item/`));

	for await (let file of files) {
		const content = JSON.parse(
			await readFile(path.join(__dirname, `../../resources/DT_Item/Item/${file}`), "utf-8"),
		)[0];

		let itemName = await getLocalizedString("en", content.Properties.Item.Name.Key);
		let raritName = await getLocalizedString(
			"en",
			"Text_Code_DCDataBlueprintLibrary_" +
				content.Properties.Item.RarityType.TagName.replaceAll(".", "_"),
		);

		if (!itemList.get(itemName + " (" + raritName + ")")) {
			itemList.set(itemName + " (" + raritName + ")", await mapItemInfo(content));
		}
	}

	return itemList;
}
