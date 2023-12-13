/**
 * - source: https://dev.to/aishanipach/debouncing-in-javascript-2k9b
 * - license: ?
 * - modified by adding TypeScript support
 */
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

export const promisedDebounceFuncWithCollectedArgs = <T>(
	func: Function,
	delay: number,
	options: { flatArgsList?: boolean } = {}
): ((...args: any) => Promise<T[]>) => {
	let _options = { flatArgsList: false, ...options };

	let timer: ReturnType<typeof setTimeout>;
	let argsList: any[] = [];
	return function (...args: any) {
		return new Promise((resolve) => {
			const context = this;
			_options.flatArgsList ? argsList.push(...args) : argsList.push(args);
			clearTimeout(timer);
			timer = setTimeout(() => {
				resolve(func.apply(context, [argsList]));
				argsList = [];
			}, delay);
		});
	};
};

export function clickOutside(node: HTMLElement) {
	// the node has been mounted in the DOM

	window.addEventListener("click", handleClick);

	function handleClick(e: PointerEvent) {
		const { target, currentTarget, relatedTarget } = e;
		if (!node.contains(e.target)) {
			node.dispatchEvent(
				new CustomEvent("outsideclick", {
					detail: { target, currentTarget, relatedTarget },
				})
			);
		}
	}

	return {
		destroy() {
			// the node has been removed from the DOM
			window.removeEventListener("click", handleClick);
		},
	};
}

/**
	source: https://stackoverflow.com/a/47112177,

	license: https://creativecommons.org/licenses/by-sa/4.0/,
	
	adapted for TypeScript support
*/
export class DeferredPromise<T> {
	#_promise: Promise<T>;
	resolve!: (value: T | PromiseLike<T>) => void;
	reject!: (reason?: any) => void;
	then: (typeof Promise)["prototype"]["then"];
	catch: (typeof Promise)["prototype"]["catch"];
	finally: (typeof Promise)["prototype"]["finally"];
	[Symbol.toStringTag]!: string;

	constructor() {
		this.#_promise = new Promise((resolve, reject) => {
			// assign the resolve and reject functions to `this`
			// making them usable on the class instance
			this.resolve = resolve;
			this.reject = reject;
		});
		// bind `then` and `catch` to implement the same interface as Promise
		this.then = this.#_promise.then.bind(this.#_promise);
		this.catch = this.#_promise.catch.bind(this.#_promise);
		this.finally = this.#_promise.finally.bind(this.#_promise);
		this[Symbol.toStringTag] = "Promise";
	}
}
