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
      `*Description:* ${oldItem.subtitle || "(none)"} → ${
        newItem.subtitle || "(none)"
      }`
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
    result.push(`*Price (US):* $${oldItem.priceUs} → $${newItem.priceUs}`);
  }
  if (oldItem.priceGlobal !== newItem.priceGlobal) {
    result.push(
      `*Price (Global):* $${oldItem.priceGlobal} → $${newItem.priceGlobal}`
    );
  }

  // Status and Fulfillment
  if (oldItem.comingSoon !== newItem.comingSoon) {
    result.push(
      `*Released:* ${!oldItem.comingSoon ? "Yes" : "No"} → ${
        !newItem.comingSoon ? "Yes" : "No"
      }`
    );
  }
  if (oldItem.outOfStock !== newItem.outOfStock) {
    result.push(
      `*In Stock:* ${!oldItem.outOfStock ? "Yes" : "No"} → ${
        !newItem.outOfStock ? "Yes" : "No"
      }`
    );
  }
  if (oldItem.fulfilledAtEnd !== newItem.fulfilledAtEnd) {
    result.push(
      `*Fulfilled at End:* ${oldItem.fulfilledAtEnd ? "Yes" : "No"} → ${
        newItem.fulfilledAtEnd ? "Yes" : "No"
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
        *New item:*
        *Name:* ${newItem.name}
        *Description:* ${newItem.subtitle || "(none)"}
        *Regions:* ${regionText(newItem)}
        *Price (US):* $${newItem.priceUs}
        *Price (Global):* $${newItem.priceGlobal}
        *Released:* ${!newItem.comingSoon ? "Yes" : "No"}
        *In Stock:* ${!newItem.outOfStock ? "Yes" : "No"}
        *Fulfilled at End:* ${newItem.fulfilledAtEnd ? "Yes" : "No"}
        `.trim()
      );
      continue;
    }

    try {
      const diff = diffItem(oldItem, newItem);
      if (diff) {
        result.push(diff);
      }
    } catch (error) {
      console.error(`Error diffing items with id ${newItem.id}:`, error);
    }
  }

  return result;
}

function regionText(item: ShopItem) {
  const regions = [];
  if (item.enabledUs) regions.push("US");
  if (item.enabledEu) regions.push("EU + UK");
  if (item.enabledIn) regions.push("IN");
  if (item.enabledCa) regions.push("CA");
  if (item.enabledXx) regions.push("Global");
  return regions.join(", ");
}
