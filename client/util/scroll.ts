// Various page scrolling aids

import { page } from "../state"
import { trigger } from "./hooks"
import { isCuck } from "../common"

const banner = document.getElementById("banner")

let scrolled = false

// Indicates if the page is scrolled to its bottom
export let atBottom: boolean

// Scroll to particular element and compensate for the banner height
export function scrollToElement(el: HTMLElement) {
	window.scrollTo(0, el.offsetTop - banner.offsetHeight - 5)
}

// Scroll to the bottom of the thread
export function scrollToBottom() {
	window.scrollTo(0, document.documentElement.scrollHeight)
	atBottom = true
}

// Check, if at the bottom of the thread and render the locking indicator
export function checkBottom() {
	if (!page.thread) {
		atBottom = false
		return
	}
	atBottom = isAtBottom()
	const lock = document.getElementById("lock")
	if (lock) {
		lock.style.visibility = atBottom ? "visible" : "hidden"
	}
}

function isAtBottom(): boolean {
	return window.innerHeight + window.scrollY
		>= document.documentElement.offsetHeight
}

// Scroll to page bottom, if previously at the bottom and the scroll away
// happened on DOM update and not user's scroll
function onFrame() {
	if (page.thread) {
		if (scrolled) {
			checkBottom()
			scrolled = false
		} else if (atBottom && !isAtBottom()) {
			window.scrollTo(0, document.body.scrollHeight)
		}
	}
	requestAnimationFrame(onFrame)
}

// Firefox's multithreaded scrolling introduces a race between scroll events and
// scrolling API updates. Just disable it for them.
if (!isCuck) {
	requestAnimationFrame(onFrame)

	document.addEventListener("scroll", () => scrolled = true, {
		passive: true,
	})

	// Unlock from bottom, when the tab is hidden, unless set not to
	document.addEventListener("visibilitychange", () => {
		const opts = trigger("getOptions")
		if (document.hidden && (opts && !opts.alwaysLock)) {
			atBottom = false
		}
	})
} else {
	// Permanently hide locking UI
	const el = document.createElement("style")
	el.innerHTML = `#lock, #alwaysLock, label[for="alwaysLock"]{display: none;}`
	document.head.append(el)
}
