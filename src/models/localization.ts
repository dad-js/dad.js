import { readFile } from "fs-extra";
import path from "path";

export const languageFileMap = {
	de: "de",
	en: "en",
	es: "es",
	fr: "fr",
	ja: "ja",
	ko: "ko",
	"pt-BR": "pt-BR",
	ru: "ru",
	"zh-Hans": "zh-Hans",
	"zh-Hant": "zh-Hant",
} as const;
export type LanguageFile = (typeof languageFileMap)[keyof typeof languageFileMap];

let localization: any;
export async function getLocalizedString(locale: LanguageFile, key: string) {
	const languageFile = languageFileMap[locale] || "en";

	if (!localization) {
		localization = JSON.parse(
			await readFile(
				path.join(__dirname, `../../resources/localization/${languageFile}/Game.json`),
				"utf-8",
			),
		);
	}

	return localization.DC[key];
}
