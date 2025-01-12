import type { ShopItem } from ".";
import { stripIndents } from "common-tags";
import { deepEquals } from "bun";

export function diffItem(oldItem: ShopItem, newItem: ShopItem) {
	if (deepEquals(oldItem, newItem)) return;
	const result = [];

	// Metadata
	if (oldItem.name !== newItem.name) {
		result.push(`*Name:* ${oldItem.name} → ${newItem.name}`);
	} else {
		result.push(`*Name:* ${oldItem.name}`);
	}
	if (oldItem.subtitle !== newItem.subtitle) {
		result.push(
			`*Subtitle:* ${oldItem.subtitle || "(none)"} → ${newItem.subtitle || "(none)"
			}`
		);
	}
	if (oldItem.description !== newItem.description) {
		result.push(
			`*Description:* ${oldItem.description || "(none)"} → ${newItem.description || "(none)"
			}`
		);
	}
	if (oldItem.customs_likely !== newItem.customs_likely) {
		result.push(
			`*Customs Likely:* ${oldItem.customs_likely ? "Yes" : "No"} → ${newItem.customs_likely ? "Yes" : "No"
			}`
		);
	}
	if (oldItem.fulfillment_description !== newItem.fulfillment_description) {
		result.push(
			`*Fulfillment Description:* ${oldItem.fulfillment_description || "(none)"} → ${newItem.fulfillment_description || "(none)"
			}`
		);
	}
	if (oldItem.limited_qty !== newItem.limited_qty) {
		result.push(
			`*Limited Quantity:* ${oldItem.limited_qty ? "Yes" : "No"} → ${newItem.limited_qty ? "Yes" : "No"
			}`
		);
	}
	if (!deepEquals(oldItem.links, newItem.links)) {
		result.push(
			`*Links:* ${oldItem.links?.join(", ") || "(none)"} → ${newItem.links?.join(", ") || "(none)"}`
		);
	}

	// Regions
	const oldRegions = regionText(oldItem);
	const newRegions = regionText(newItem);
	if (oldRegions !== newRegions) {
		result.push(`*Regions:* ${oldRegions} → ${newRegions}`);
	}

	// Price
	if (oldItem.priceUs !== newItem.priceUs) {
		result.push(
			`*Price (US):* :doubloon: ${oldItem.priceUs} → :doubloon: ${newItem.priceUs}`
		);
	}
	if (oldItem.priceGlobal !== newItem.priceGlobal) {
		result.push(
			`*Price (Global):* :doubloon: ${oldItem.priceGlobal} → :doubloon: ${newItem.priceGlobal}`
		);
	}

	// Status and Fulfillment
	if (oldItem.comingSoon !== newItem.comingSoon) {
		result.push(
			`*Released:* ${!oldItem.comingSoon ? "Yes" : "No"} → ${!newItem.comingSoon ? "Yes" : "No"
			}`
		);
	}
	if (oldItem.outOfStock !== newItem.outOfStock) {
		result.push(
			`*In Stock:* ${!oldItem.outOfStock ? "Yes" : "No"} → ${!newItem.outOfStock ? "Yes" : "No"
			}`
		);
	}
	if (oldItem.fulfilledAtEnd !== newItem.fulfilledAtEnd) {
		result.push(
			`*Fulfilled at End:* ${oldItem.fulfilledAtEnd ? "Yes" : "No"} → ${newItem.fulfilledAtEnd ? "Yes" : "No"
			}`
		);
	}

	return result.join("\n");
}

export function diffItems(
	oldItems: ShopItem[],
	newItems: ShopItem[]
): string[] {
	const result: string[] = [];
	const oldItemsMap = new Map(oldItems.map((item) => [item.id, item]));

	for (const newItem of newItems) {
		const oldItem = oldItemsMap.get(newItem.id);
		if (!oldItem) {
			result.push(
				stripIndents`
        			*New item! :blobby-heavy_plus_sign:*
        			*Name:* ${newItem.name}
					${newItem.subtitle ? `_${newItem.subtitle}_` : ""}${newItem.description ? `\n${newItem.description}` : ""}
        			*Regions:* ${regionText(newItem)}

        			*Price (US):* :doubloon: ${newItem.priceUs}
        			*Price (Global):* :doubloon: ${newItem.priceGlobal}

        			*Released:* ${!newItem.comingSoon ? "Yes" : "No"}
        			*In Stock:* ${!newItem.outOfStock ? "Yes" : "No"}
					*Limited Quantity:* ${newItem.limited_qty ? "Yes" : "No"}
					*Customs Likely:* ${newItem.customs_likely ? "Yes" : "No"}
					
					*Fulfillment Description:* ${newItem.fulfillment_description || "(none)"}
        			*Fulfilled at End:* ${newItem.fulfilledAtEnd ? "Yes" : "No"}

					*Links:* ${newItem.links?.join(", ") || "(none)"}
        		`.trim()
			);
			continue;
		}

		for (const oldItem of oldItems) {
			if (!newItems.find((item) => item.id === oldItem.id)) {
				result.push(
					stripIndents`
          				*Deleted item! :tw_warning:*
          				*Name:* ${oldItem.name}
          				*Description:* ${oldItem.subtitle || "(none)"}
          			`.trim()
				);
			}
		}

		const diff = diffItem(oldItem, newItem);
		if (diff) {
			result.push(diff);
		}
	}

	return result;
}

function regionText(item: ShopItem) {
	const regions = [];
	if (item.enabledUs) regions.push("US");
	if (item.enabledEu) regions.push("EU + UK");
	if (item.enabledIn) regions.push("India");
	if (item.enabledCa) regions.push("Canada");
	if (item.enabledAu) regions.push("Australia");
	if (item.enabledXx) regions.push("Global");
	return regions.join(", ");
}
