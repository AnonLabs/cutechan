// File upload via drag and drop

import { postSM, postEvent } from "."
import { trigger } from "../../util"
import { page } from "../../state"
import FormModel from "./model"

// Handle file drop
function onDrop(e: DragEvent) {
	const {files} = e.dataTransfer

	// TODO: Drag & drop for thread creation
	if (!files.length || !page.thread) {
		return
	}

	e.stopPropagation()
	e.preventDefault()

	// Create form, if none
	postSM.feed(postEvent.open)

	// Neither disconnected, errored or already has image
	const m = trigger("getPostModel") as FormModel
	if (m && !m.image) {
		m.uploadFile(files[0])
	}
}

function stopDefault(e: Event) {
	// No drag and drop for thread creation right now. Keep default behavior.
	if (page.thread) {
		e.stopPropagation()
		e.preventDefault()
	}
}

export default () => {
	// Bind listeners
	const threads = document.getElementById("threads")
	for (let event of ["dragenter", "dragexit", "dragover"]) {
		threads.addEventListener(event, stopDefault)
	}
	threads.addEventListener("drop", onDrop)
}
