export function extractNumbersFromString(str: string) {
	const regex = /(\d+)/g;
	return str.match(regex)?.map((stringedNum) => parseInt(stringedNum)) || [];
}
