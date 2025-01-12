import "../instrument";
import "dotenv/config";
import { z } from "zod";
import { chromium } from "playwright";
import { writeFile, exists, mkdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { getSlackBlocks } from "./slack";
import { diffItems } from "./diff";
import { fromError as fromZodError } from "zod-validation-error";
import htmlToMrkdwn from "html-to-mrkdwn-ts";
import ignoredItems from "../ignore.json";

const Env = z.object({
	HIGHSEAS_SESSION_TOKEN: z.string(),
	SLACK_WEBHOOK_URL: z.string().url(),
	SENTRY_DSN: z.string().url().optional(),
	SLACK_SUBTEAM_ID: z.string(),
});
const ShopItem = z.object({
	id: z.string(),
	name: z.string(),
	subtitle: z.string().optional(),
	imageUrl: z.string(),
	enabledUs: z.boolean(),
	enabledEu: z.boolean(),
	enabledIn: z.boolean(),
	enabledXx: z.boolean(),
	enabledCa: z.boolean(),
	enabledAu: z.boolean().default(false),
	priceUs: z.number(),
	priceGlobal: z.number(),
	fulfilledAtEnd: z.boolean(),
	comingSoon: z.boolean(),
	outOfStock: z.boolean(),
	description: z.string().optional(),
	customs_likely: z.boolean().optional(),
	fulfillment_description: z.string().optional(),
	links: z.array(z.string()).optional(),
	limited_qty: z.boolean().optional(),
});
export type ShopItem = z.infer<typeof ShopItem>;
const ShopItems = z.array(ShopItem);
export type ShopItems = z.infer<typeof ShopItems>;
export const env = Env.parse(process.env);

const browser = await chromium.launch();
const context = await browser.newContext();
context.addCookies([
	{
		name: "hs-session",
		path: "/",
		value: decodeURIComponent(env.HIGHSEAS_SESSION_TOKEN),
		domain: "highseas.hackclub.com",
	},
]);

const page = await context.newPage();
await page.goto("https://highseas.hackclub.com/shop", {
	waitUntil: "networkidle",
});

const storage = await context.storageState();
const localStorage = storage.origins[0].localStorage;
const rawJson = localStorage.find(
	(item) => item.name === "cache.shopItems"
)?.value;
if (!rawJson) {
	throw new Error("Could not find cache.shopItems in localStorage");
}
const json = JSON.parse(rawJson);
const items = json.value;
const filteredItems = items
	.filter(
		(item: { id: string }) => !ignoredItems.includes(item.id)
	)
	// biome-ignore lint/suspicious/noExplicitAny: I don't have time for this today.
	.map((item: any) => {
		return {
			...item,
			links: item.links?.filter(Boolean),
			fulfillment_description:
				item.fulfillment_description && htmlToMrkdwn(item.fulfillment_description).text,
			description: item.description && htmlToMrkdwn(item.description).text,
			subtitle: item.subtitle && htmlToMrkdwn(item.subtitle).text,
		};
	});

const shopItems = ShopItems.safeParse(filteredItems);
if (shopItems.success === false) {
	throw fromZodError(shopItems.error);
}

const time = Date.now();

const dataDirExists = await exists("data");
const latestPtrExists = await exists("latest.highseas");
if (!dataDirExists) {
	console.warn("data directory does not exist, creating it.");
	await mkdir("data");
}

await writeFile(`data/${time}.json`, JSON.stringify(shopItems.data, null, 2));

if (!latestPtrExists) {
	console.warn("latest.highseas does not exist, creating it and exiting.");
	await writeFile("latest.highseas", time.toString());
	await browser.close();
	process.exit(0);
}

const previousTime = Number.parseInt(await readFile("latest.highseas", "utf-8"));
console.log(`Reading previous data from data/${previousTime}.json`);
const previousShopItems = ShopItems.parse(
	JSON.parse(await readFile(`data/${previousTime}.json`, "utf-8"))
);
await writeFile("latest.highseas", time.toString());

const diffs = diffItems(previousShopItems, shopItems.data);
if (diffs.length === 0) {
	console.log("No changes detected");
	await browser.close();
	process.exit(0);
}

const blocks = getSlackBlocks(diffs);

try {
	const initialResponse = await fetch(env.SLACK_WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(blocks),
	});
	if (initialResponse.status !== 200) {
		throw new Error(`Failed to send initial message: ${await initialResponse.text()}`);
	}

	const finalResponse = await fetch(env.SLACK_WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			blocks: [
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `<!subteam^${env.SLACK_SUBTEAM_ID}> *- please reply to the message above*`,
					},
				},
			],
		}),
	});
	if (finalResponse.status !== 200) {
		throw new Error(`Failed to send final message: ${await finalResponse.text()}`);
	}
} catch (error) {
	console.error(error);
} finally {
	await browser.close();
}
