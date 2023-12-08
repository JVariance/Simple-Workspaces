export const debounceFunc = (func: Function, delay: number) => {
	let timer: ReturnType<typeof setTimeout>;
	return function (...args: any) {
		const context = this;
		clearTimeout(timer);
		timer = setTimeout(() => {
			func.apply(context, args);
		}, delay);
	};
};

export const promisedDebounceFunc = <T>(
	func: Function,
	delay: number
): ((...args: any) => Promise<T>) => {
	let timer: ReturnType<typeof setTimeout>;
	return function (...args: any) {
		return new Promise((resolve) => {
			const context = this;
			clearTimeout(timer);
			timer = setTimeout(() => {
				return resolve(func.apply(context, args));
			}, delay);
		});
	};
};
