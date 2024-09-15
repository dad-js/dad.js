import { Store } from "../libs/store";
import { Module } from "../libs/module";

import { mapMarketplaceResponse, type MarketplaceResponse } from "../models/marketplace";
import type { Unmessage } from "@dad-js/dad-api";
import type { SMARKETPLACE_TRADE_ITEM_INFO } from "@dad-js/dad-api/pb";

export class MarketplaceModule extends Module {
	readonly marketplaceItems = new Store<MarketplaceResponse>();

	async init() {
		this.client.api.marketPlace.onMarketplaceItemListRes(async (p) => {
			if (p.itemInfos) {
				this.marketplaceItems.value = await mapMarketplaceResponse(
					p.currentPage,
					p.maxPage,
					p.itemInfos,
				);
			}
		});
	}

	async refreshDefaultMarketplace() {
		const items = await this.client.api.marketPlace.marketplaceItemList({
			currentPage: 1,
			sortMethod: 0,
			sortType: 0,
			filterInfos: [],
		});

		return await mapMarketplaceResponse(items.currentPage, items.maxPage, items.itemInfos);
	}

	async buyItem(listingId: bigint, tradeInfos: Unmessage<SMARKETPLACE_TRADE_ITEM_INFO>[]) {
		const purchaseResult = await this.client.api.marketPlace.marketplaceItemBuy({
			listingId,
			tradeInfos,
		});

		return purchaseResult;
	}
}
