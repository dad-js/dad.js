import type { Unmessage } from "@dad-js/dad-api";
import { mapItem } from "./item";
import type { SLOGIN_CHARACTER_INFO } from "@dad-js/dad-api/pb";
import type { CharacterGender } from "./enums";

// TODO replace with class datatable
export const characterClassMap = {
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Fighter": "Fighter",
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Barbarian": "Barbarian",
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Rogue": "Rogue",
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Ranger": "Ranger",
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Cleric": "Cleric",
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Bard": "Bard",
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Warlock": "Warlock",
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Druid": "Druid",
	"DesignDataPlayerCharacter:Id_PlayerCharacter_Wizard": "Wizard",
} as const;

export type CharacterClass = (typeof characterClassMap)[keyof typeof characterClassMap];

export const mapCharacterInfo = async (info: Unmessage<SLOGIN_CHARACTER_INFO>) => ({
	id: info.characterId,
	name: info.nickName!.originalNickName,
	class: characterClassMap[info.characterClass as keyof typeof characterClassMap],
	createdAt: info.createAt,
	gender: info.gender as CharacterGender,
	level: info.level,
	lastLoginDate: info.lastloginDate,
	equippedItems: await Promise.all(info.equipItemList.map((i) => mapItem(i))),
	equippedCharacterSkins: info.equipCharacterSkinList,
	equippedItemSkins: info.equipItemSkinList,
	equippedArmorSkins: info.equipArmorSkinList,
	fame: info.nickName!.fame,
	karma: info.nickName!.karmaRating,
	rank: info.nickName!.rankId,
	hiddenName: info.nickName!.streamingModeNickName,
});

export type CharacterInfo = Awaited<ReturnType<typeof mapCharacterInfo>>;
