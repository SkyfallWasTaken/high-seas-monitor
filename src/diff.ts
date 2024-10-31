import type { ShopItem, ShopItems } from ".";

export function diff(oldItems: ShopItems, newItems: ShopItems) {
  let updates = [];
  const addedItems = newItems.filter(
    (item) => !oldItems.find((prev) => prev.id === item.id)
  );
  const removedItems = oldItems.filter(
    (prev) => !newItems.find((item) => item.id === prev.id)
  );

  for (const item of addedItems) {
    updates.push({
      type: "added",
      item,
    });
  }
  for (const item of removedItems) {
    updates.push({
      type: "removed",
      item,
    });
  }
  for (const item of newItems) {
    const prev = oldItems.find((prev) => prev.id === item.id);
    if (!prev) {
      continue;
    }

    // Prices
    if (prev.priceGlobal !== item.priceGlobal) {
      updates.push({
        type: "priceChangeGlobal",
        item,
        prevPriceGlobal: prev.priceGlobal,
      });
    }
    if (prev.priceUs !== item.priceUs) {
      updates.push({
        type: "priceChangeUs",
        item,
        prevPriceUs: prev.priceUs,
      });
    }

    // Stock + fulfillment status
    if (prev.outOfStock !== item.outOfStock) {
      updates.push({
        type: "stockStatusUpdate",
        item,
        prevStatus: prev.outOfStock,
      });
    }
    if (prev.fulfilledAtEnd !== item.fulfilledAtEnd) {
      updates.push({
        type: "fulfillmentTimeUpdate",
        item,
        prevFulfillmentTime: prev.fulfilledAtEnd,
      });
    }
    if (prev.comingSoon !== item.comingSoon) {
      updates.push({
        type: "comingSoonUpdate",
        item,
        prevComingSoon: prev.comingSoon,
      });
    }

    // Region updates
    const regionAvailabilityOld: RegionAvailability =
      getRegionAvailability(prev);
    const regionAvailabilityNew: RegionAvailability =
      getRegionAvailability(item);
    for (const region of Object.keys(
      regionAvailabilityOld
    ) as (keyof RegionAvailability)[]) {
      if (regionAvailabilityOld[region] !== regionAvailabilityNew[region]) {
        updates.push({
          type: "regionAvailabilityUpdate",
          item,
          region,
          prevRegionAvailability: regionAvailabilityOld[region],
        });
      }
    }

    // Metadata changes
    if (prev.name !== item.name) {
      updates.push({
        type: "nameChange",
        item,
        prevName: prev.name,
      });
    }
    if (prev.subtitle !== item.subtitle) {
      updates.push({
        type: "subtitleChange",
        item,
        prevSubtitle: prev.subtitle,
      });
    }
    if (prev.imageUrl !== item.imageUrl) {
      updates.push({
        type: "imageUrlChange",
        item,
        prevImageUrl: prev.imageUrl,
      });
    }
  }
}

type RegionAvailability = {
  us: boolean;
  eu: boolean;
  in: boolean;
  xx: boolean;
  ca: boolean;
};
function getRegionAvailability(item: ShopItem): RegionAvailability {
  return {
    us: item.enabledUs,
    eu: item.enabledEu,
    in: item.enabledIn,
    xx: item.enabledXx,
    ca: item.enabledCa,
  };
}
