import memoizee from "memoizee";
import { loadDataTable } from "../libs";

interface DTItemPropertyType {
	Type: string;
	Name: string;
	Class: string;
	Properties: DTProperties;
}

interface DTProperties {
	Item: DTItem;
}

interface DTItem {
	PropertyTypeGroupId: number;
	PropertyType: DTType;
	EffectClass: DTEffectClass;
	EffectType: DTType;
	ValueRatio: number;
}

interface DTEffectClass {
	ObjectName: string;
	ObjectPath: string;
}

interface DTType {
	TagName: string;
}

async function getMappedItemPropertyType(itemPropertyTypeName: string) {
	const primaryProperties = (await loadDataTable(
		`DT_ItemProperty/ItemPropertyType/${itemPropertyTypeName}`,
	)) as DTItemPropertyType;

	const i = primaryProperties.Properties.Item;

	return {
		tagName: i.PropertyType.TagName,
		group: i.PropertyTypeGroupId,
		ratio: i.ValueRatio,
	};
}

export type ItemPropertyTypeData = ReturnType<Awaited<typeof getMappedItemPropertyType>>;

export const getItemPropertyTypeData = memoizee(getMappedItemPropertyType) as any as (
	itemPropertyTypeName: string,
) => Promise<ItemPropertyTypeData>;
