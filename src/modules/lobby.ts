import type { SCHARACTER_INFO } from "@dad-js/dad-api/pb";
import { Store } from "../libs/store";
import { decode, encode, Unmessage } from "@dad-js/dad-api";
import { Module } from "../libs/module";
import { Inventory, mapInventory } from "../models/inventory";
import { InventoryType, type ItemPosition } from "../models";

export class LobbyModule extends Module {
	readonly allInventories = new Store<Inventory[]>([]);
	readonly equipment = this.allInventories.derive(
		async (invs) => invs.find((inv) => inv.id === InventoryType.EQUIPPED)!,
	);
	readonly inventory = this.allInventories.derive(
		async (invs) => invs.find((inv) => inv.id === InventoryType.INVENTORY)!,
	);
	readonly stash = this.allInventories.derive(async (invs) =>
		invs.filter(
			(inv) => inv.id !== InventoryType.EQUIPPED && inv.id !== InventoryType.INVENTORY,
		),
	);
	readonly allItems = this.allInventories.derive(async (invs) => invs.flatMap((i) => i.items));

	async init() {
		this.client.api.lobby.onLobbyCharacterInfoRes(async (p) => {
			if (p.characterDataBase) {
				this.allInventories.value = await Promise.all([
					mapInventory(
						InventoryType.INVENTORY,
						p.characterDataBase.CharacterItemList.filter(
							(i) => i.inventoryId === InventoryType.INVENTORY,
						),
					),
					mapInventory(
						InventoryType.EQUIPPED,
						p.characterDataBase.CharacterItemList.filter(
							(i) => i.inventoryId === InventoryType.EQUIPPED,
						),
					),
					...p.characterDataBase.CharacterStorageInfos.map((s) =>
						mapInventory(s.inventoryId, s.CharacterStorageItemList),
					),
				]);
			}
		});

		this.client.networker.server.on("C2S_INVENTORY_MOVE_REQ", (payload) => {
			const move = decode("C2S_INVENTORY_MOVE_REQ", payload);
			if (!move.srcInfo) return;
			this.reflectMoveUpdate(
				{
					inventory: move.srcInfo?.inventoryId,
					slot: move.srcInfo?.slotId,
					uid: move.srcInfo?.uniqueId,
				},
				{ inventory: move.dstInventoryId, slot: move.dstSlotId },
			);
		});
		this.client.networker.server.on("C2S_INVENTORY_SWAP_REQ", () => {
			this.client.api.lobby.sendLobbyCharacterInfoReq({});
		});
		this.client.networker.server.on("C2S_INVENTORY_MERGE_REQ", () => {
			this.client.api.lobby.sendLobbyCharacterInfoReq({});
		});
		this.client.networker.server.on("C2S_INVENTORY_SPLIT_MOVE_REQ", () => {
			this.client.api.lobby.sendLobbyCharacterInfoReq({});
		});
	}

	getItem(itm: ItemPosition) {
		const inv = this.allInventories.value.find((inv) => (inv.id = itm.inventory));
		return inv?.items.find((i) => i.slot === itm.slot);
	}

	async moveItem(from: ItemPosition, to: Omit<ItemPosition, "uid">) {
		this.reflectMoveUpdate(from, to);
		this.client.api.inventory.sendInventoryMoveReq({
			dstInventoryId: to.inventory,
			dstSlotId: to.slot,
			srcInfo: {
				inventoryId: from.inventory,
				slotId: from.slot,
				uniqueId: from.uid ?? ("" as any),
			},
		});
		this.client.api.lobby.sendLobbyCharacterInfoReq({});
	}

	private async reflectMoveUpdate(from: ItemPosition, to: Omit<ItemPosition, "uid">) {
		const fromInv = this.allInventories.value.find((i) => i.id === from.inventory);
		const toInv = this.allInventories.value.find((i) => i.id === to.inventory);
		if (!fromInv || !toInv) return;

		const fromItemIdx = fromInv.items.findIndex((i) => i.slot === from.slot);
		if (fromItemIdx === -1) return;

		const item = fromInv.items.splice(fromItemIdx, 1)[0];
		item.inventory = to.inventory;
		item.slot = to.slot;
		toInv.items.push(item);

		this.allInventories.value = this.allInventories.value;
	}

	async swapItem(from: ItemPosition, to: ItemPosition) {
		await this.client.api.inventory.inventorySwap({
			swapInfos: [
				{
					newInventoryId: from.inventory,
					newSlotId: from.slot,
					dstInfo: {
						inventoryId: to.inventory,
						slotId: to.slot,
						uniqueId: to.uid ?? ("" as any),
					},
				},
			],
			srcInfo: {
				inventoryId: from.inventory,
				slotId: from.slot,
				uniqueId: from.uid ?? ("" as any),
			},
			dstInfo: {
				inventoryId: to.inventory,
				slotId: to.slot,
				uniqueId: to.uid ?? ("" as any),
			},
		});
		this.client.api.lobby.sendLobbyCharacterInfoReq({});
		await this.stash.changed;
	}

	//TODO merge, split item
}
