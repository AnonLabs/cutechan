import { setBoardConfig, hidden, mine, posts, page } from "../state"
import { PostData } from "../common"
import { Post, PostView } from "../posts"
import lang from "../lang"
import { postAdded, notifyAboutReply } from "../ui"
import { extractJSON } from "../util"
import { POST_BACKLINKS_SEL } from "../vars"

// Find board configurations in the HTML and apply them
export function extractConfigs() {
	setBoardConfig(extractJSON("board-configs"))
}

// Extract pregenerated rendered post data from DOM
export function extractPageData<T>(): {
	threads: T,
	backlinks: { [id: number]: { [id: number]: number } },
} {
	return {
		threads: extractJSON("post-data"),
		backlinks: extractJSON("backlink-data"),
	}
}

// Check if the rendered page is a ban page
export function isBanned(): boolean {
	return !!document.querySelector(".ban-page")
}

// Extract post model and view from the HTML fragment and apply client-specific
// formatting. Returns whether the element was removed.
export function extractPost(
	post: PostData,
	op: number,
	board: string,
	backlinks: { [id: number]: { [id: number]: number } },
): boolean {
	const el = document.getElementById(`post${post.id}`)
	if (hidden.has(post.id)) {
		el.remove()
		return true
	}
	post.op = op
	post.board = board

	const model = new Post(post)
	const view = new PostView(model, el)
	posts.add(model)

	if (page.catalog) {
		return false
	}

	model.backlinks = backlinks[post.id]

	view.afterRender()
	personalizeLinks(model)
	personalizeBacklinks(model)
	postAdded(model)

	return false
}

function addYous(id: number, el: HTMLElement) {
	for (let a of el.querySelectorAll(`a[data-id="${id}"]`)) {
		a.textContent += ` ${lang.posts.you}`
	}
}

// Add (You) to posts linking to the user's posts. Appends to array of posts,
// that might need to register a new reply to one of the user's posts.
function personalizeLinks(post: Post) {
	if (!post.links) {
		return
	}
	let el: HTMLElement,
		isReply = false
	for (let id of new Set(post.links.map(l => l[0]))) {
		if (!mine.has(id)) {
			continue
		}
		isReply = true

		// Don't query DOM, until we know we need it
		if (!el) {
			el = post.view.el.querySelector("blockquote")
		}
		addYous(id, el)
	}
	if (isReply) {
		notifyAboutReply(post)
	}
}

// Add (You) to backlinks user's posts
function personalizeBacklinks(post: Post) {
	if (!post.backlinks) {
		return
	}
	let el: HTMLElement
	for (let idStr in post.backlinks) {
		const id = parseInt(idStr)
		if (!mine.has(id)) {
			continue
		}
		// Don't query DOM, until we know we need it
		if (!el) {
			el = post.view.el.querySelector(POST_BACKLINKS_SEL)
		}
		addYous(id, el)
	}
}

// If the post is still open, rerender its body, to sync the parser state.
// Needs to be done after models are populated to resolve temporary image links
// in open posts.
export function reparseOpenPosts() {
	for (let m of posts) {
		if (m.editing) {
			m.view.reparseBody()
		}
	}
}
