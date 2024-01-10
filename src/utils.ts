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

/**
 * - source: https://stackoverflow.com/a/34552145
 * - license: CC BY-SA 3.0
 * - modified by adding TypeScript support
 */
export function immediateDebounceFunc(func: Function, delay: number) {
	var timer = 0;
	return function debouncedFn() {
		if (Date.now() - timer > delay) {
			func();
		}
		timer = Date.now();
	};
}

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
	#promise!: Promise<T>;
	#resolve!: (value: T | PromiseLike<T> | void) => void;
	reject!: (reason?: any) => void;
	then!: (typeof Promise)["prototype"]["then"];
	catch!: (typeof Promise)["prototype"]["catch"];
	finally!: (typeof Promise)["prototype"]["finally"];
	[Symbol.toStringTag]!: string;
	#state: "idle" | "pending" | "fulfilled" = "idle";

	constructor() {
		return this;
	}

	#init() {
		this.#promise = new Promise((resolve, reject) => {
			// assign the resolve and reject functions to `this`
			// making them usable on the class instance
			this.#resolve = resolve as (value: T | PromiseLike<T> | void) => void;
			this.reject = reject;
		});
		this.#promise.finally(() => (this.#state = "fulfilled"));
		// bind `then` and `catch` to implement the same interface as Promise
		this.then = this.#promise.then.bind(this.#promise);
		this.catch = this.#promise.catch.bind(this.#promise);
		this.finally = this.#promise.finally.bind(this.#promise);
		this[Symbol.toStringTag] = "Promise";
		this.#state = "pending";
	}

	start() {
		this.#init();
		return this;
	}

	finish() {
		this.#resolve();
		return this;
	}

	get state() {
		return this.#state;
	}
}
