import { readFile } from "node:fs/promises";
import type { ShopItem } from "../src";

const latestPtr = await readFile("latest.highseas", "utf-8");
const data = await readFile(`data/${latestPtr}.json`, "utf-8");
const items = JSON.parse(data) as Record<string, ShopItem>;

for (const item of Object.values(items)) {
	if (item.enabledAu) {
		console.log(`- ${item.name}`);
	}
}
