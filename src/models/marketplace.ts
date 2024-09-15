import { mapItem } from "./item";

import type { SMARKETPLACE_ITEM_INFO } from "@dad-js/dad-api/pb";
import type { Unmessage } from "@dad-js/dad-api";

export const mapMarketplaceItem = async (item: Unmessage<SMARKETPLACE_ITEM_INFO>) => ({
	listingId: item.listingId,
	item: await mapItem(item.item!),
	price: item.price,
	remainExpirationTime: item.remainExpirationTime,
	nickname: item.nickname,
});

export const mapMarketplaceResponse = async (
	currentPage: number,
	maxPage: number,
	items: Unmessage<SMARKETPLACE_ITEM_INFO>[],
) => ({
	items: await Promise.all(items.map(mapMarketplaceItem)),
	currentPage: currentPage,
	maxPage: maxPage,
});

export type MarketplaceResponse = Awaited<ReturnType<typeof mapMarketplaceResponse>>;
