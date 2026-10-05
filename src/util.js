export function pageSize() {
	return 200;
}

export function pageCount(total) {
	return Math.ceil(total / pageSize());
}
