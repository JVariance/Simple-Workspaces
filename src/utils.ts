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
