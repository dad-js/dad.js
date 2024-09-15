import type { SItem } from "@dad-js/dad-api/pb";
import { mapItem } from "./item";
import type { InventoryType } from "./enums";
import type { Unmessage } from "@dad-js/dad-api";

export const mapInventory = async (inventoryId: number, items: Unmessage<SItem>[]) => ({
	id: inventoryId as InventoryType,
	items: await Promise.all(items.map(mapItem)),
});

export type Inventory = Awaited<ReturnType<typeof mapInventory>>;
