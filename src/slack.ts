import { getLastCommit } from "git-last-commit";
import { promisify } from "node:util";
const lastCommit = await promisify(getLastCommit)();
import { version as pkgVersion } from "../package.json";

export function getSlackBlocks(diffs: string[]) {
	if (diffs.length === 0) return;
	const blocks = [];
	blocks.push({
		type: "header",
		text: {
			type: "plain_text",
			text: "Changes detected in the shop",
			emoji: true,
		},
	});
	for (const diff of diffs) {
		blocks.push({
			type: "section",
			text: {
				type: "mrkdwn",
				text: diff,
			},
		});
		blocks.push({
			type: "divider",
		});
	}
	blocks.push({
		type: "context",
		elements: [
			{
				type: "mrkdwn",
				text: `high-seas-monitor v${pkgVersion} • commit ${lastCommit.shortHash}`,
			},
		],
	});
	return {
		blocks,
	};
}
