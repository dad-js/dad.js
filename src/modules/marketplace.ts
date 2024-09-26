import { Store } from "../libs/store";
import { Module } from "../libs/module";

import { mapMarketplaceResponse, type MarketplaceResponse } from "../models/marketplace";
import type { MarketplaceItemListRes, Unmessage } from "@dad-js/dad-api";
import type { SMARKETPLACE_TRADE_ITEM_INFO } from "@dad-js/dad-api/pb";
import type { Item } from "../models";

export class MarketplaceModule extends Module {
	readonly marketplaceItems = new Store<MarketplaceResponse>();

	async init() {
		this.client.api.marketPlace.onMarketplaceItemListRes(async (p) => {
			this.#setMarketplaceItems(p);
		});
	}

	async #setMarketplaceItems(listResponse: MarketplaceItemListRes) {
		if (listResponse.itemInfos) {
			this.marketplaceItems.value = await mapMarketplaceResponse(
				listResponse.currentPage,
				listResponse.maxPage,
				listResponse.itemInfos,
			);
		}
	}

	async refreshDefaultMarketplace() {
		const listResponse = await this.client.api.marketPlace.marketplaceItemList({
			currentPage: 1,
			sortMethod: 0,
			sortType: 0,
			filterInfos: [],
		});

		return await mapMarketplaceResponse(
			listResponse.currentPage,
			listResponse.maxPage,
			listResponse.itemInfos,
		);
	}

	async buyItem(listingId: bigint, tradeInfos: Unmessage<SMARKETPLACE_TRADE_ITEM_INFO>[]) {
		const purchaseResult = await this.client.api.marketPlace.marketplaceItemBuy({
			listingId,
			tradeInfos,
		});

		return purchaseResult;
	}

	async sellItem(item: Item, price: number) {
		const sellItemResult = await this.client.api.marketPlace.marketplaceItemRegister({
			priceInfos: [
				{
					itemId: "DesignDataItem:Id_Item_GoldCoins",
					price: price,
				},
			],
			registerInfo: {
				uniqueId: item.uid,
				itemCount: item.count,
				itemContentsCount: item.contents,
			},
		});

		return sellItemResult;
	}
}
