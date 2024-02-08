export function overflowSwipe(node: HTMLElement) {
	let swipeStarted = false;
	let swiping = false;
	let startSwipePos = { x: 0, y: 0 };
	let endSwipePos = { x: 0, y: 0 };
	let currentSwipePos = { x: 0, y: 0 };
	let startTimeStamp = 0;
	const minSwipeDistance = 50;

	const style = document.createElement("style");
	style.innerHTML = `
		.swiping * { 
			pointer-events: none;
		}

		.swipe-item.swiping {
			scroll-behavior: auto;
		}
	`;
	document.head.appendChild(style);

	console.info({ node });

	function swipeStart(
		event: PointerEvent & { currentTarget: EventTarget & HTMLElement }
	) {
		const target = event.target as HTMLElement;
		if (
			!target.classList.contains("swipe-item") &&
			!target.closest(".swipe-item")
		)
			return;
		startTimeStamp = event.timeStamp;
		swipeStarted = true;
		startSwipePos.x = event.clientX;
		startSwipePos.y = event.clientY;
		currentSwipePos = { ...startSwipePos };
	}

	function swipeMove(
		event: PointerEvent & { currentTarget: EventTarget & HTMLElement }
	) {
		if (
			swipeStarted &&
			!swiping &&
			Math.abs(startSwipePos.x - event.clientX) > 20
		) {
			node.classList.add("swiping");
		}

		if (swipeStarted) {
			swiping = true;
			node.style.cursor = "grabbing";
			const deltaPos = {
				x: currentSwipePos.x - event.clientX,
				y: currentSwipePos.y - event.clientY,
			};
			node?.scrollBy({ left: deltaPos.x });
			currentSwipePos.x = event.clientX;
			currentSwipePos.y = event.clientY;
		}
	}

	function swipeEnd(
		event: PointerEvent & { currentTarget: EventTarget & HTMLElement }
	) {
		if (swiping) {
			finishSwipe(event);
		}

		swiping = false;
		swipeStarted = false;
	}

	function cancelSwipe(
		event: PointerEvent & {
			target: HTMLElement;
			currentTarget: EventTarget & HTMLElement;
		}
	) {
		if (swiping) {
			swiping = false;
			swipeStarted = false;
			finishSwipe(event);
		}
	}

	function finishSwipe(
		event: PointerEvent & {
			currentTarget: EventTarget & HTMLElement;
		}
	) {
		node.style.cursor = "default";
		endSwipePos.x = event.clientX;
		endSwipePos.y = event.clientY;
		node.classList.remove("swiping");
		node.style.scrollBehavior = "smooth";

		const endTimeStamp = event.timeStamp;
		const time = endTimeStamp - startTimeStamp;
		const distance = Math.abs(endSwipePos.x - startSwipePos.x);
		const speed = distance / time;
		const processedSpeed = Math.max(0, Math.round(speed * 2) / 2);

		const deltaPos = {
			x: startSwipePos.x - endSwipePos.x,
			y: startSwipePos.y - endSwipePos.y,
		};

		const xDirection = deltaPos.x < 0 ? "left" : "right";

		if (Math.abs(deltaPos.x) > minSwipeDistance) {
			switch (xDirection) {
				case "left":
					// previousSection();
					node.scrollBy({ left: -200 * processedSpeed });
					break;
				case "right":
					// nextSection();
					node.scrollBy({ left: 200 * processedSpeed });
					break;
				default:
					// node.scrollBy({ left: deltaPos.x });
					break;
			}
		}

		// scrollViewIntoView();
		setTimeout(() => {
			node.style.scrollBehavior = "auto";
		}, 200);
	}

	node.addEventListener("mousedown", swipeStart);
	node.addEventListener("mousemove", swipeMove);
	node.addEventListener("mouseup", swipeEnd);
	node.addEventListener("mouseleave", cancelSwipe);

	function bodyMouseLeave(event) {
		cancelSwipe(event);
	}

	document.body.addEventListener("mouseleave", bodyMouseLeave);

	return {
		destroy() {
			document.head.removeChild(style);
			document.body.removeEventListener("mouseleave", bodyMouseLeave);
		},
	};
}
