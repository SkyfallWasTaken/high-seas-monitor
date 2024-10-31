import "dotenv/config";
import { z } from "zod";
import { chromium } from "playwright";
import { writeFile, exists, mkdir } from "fs/promises";
import { readFile } from "fs/promises";
import { diff } from "./diff";

const Env = z.object({
  HIGHSEAS_SESSION_TOKEN: z.string(),
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
  priceUs: z.number(),
  priceGlobal: z.number(),
  fulfilledAtEnd: z.boolean(),
  comingSoon: z.boolean(),
  outOfStock: z.boolean(),
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
const shopItems = ShopItems.parse(JSON.parse(rawJson).value);
console.log(shopItems);
const time = Date.now();

if (!(await exists("data"))) {
  console.warn("data directory does not exist, creating it.");
  await mkdir("data");
}
if (!(await exists("latest.highseas"))) {
  console.warn("latest.highseas does not exist, creating it and exiting.");
  await writeFile("latest.highseas", time.toString());
  await writeFile(
    `data/${time}.json`,
    JSON.stringify(diff([], shopItems), null, 2)
  );
  await browser.close();
  process.exit(0);
}

const previousTime = parseInt(await readFile("latest.highseas", "utf-8"));
console.log(`Reading previous data from data/${previousTime}.json`);
const previousShopItems = ShopItems.parse(
  JSON.parse(await readFile(`data/${previousTime}.json`, "utf-8"))
);
const diffs = diff(previousShopItems, shopItems);
await writeFile(`data/${time}.json`, JSON.stringify(diffs, null, 2));

await browser.close();
