export function shortenHash(hash: string, length: number = 7): string {
	if (!hash) return "";
	return hash.trim().slice(0, length);
}
