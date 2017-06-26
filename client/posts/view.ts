import { Post } from './model'
import {
    makeFrag, importTemplate, getID, escape, firstChild, pad
} from '../util'
import { parseBody, relativeTime, renderPostLink } from './render'
import ImageHandler from "./images"
import { ViewAttrs } from "../base"
import { findSyncwatches } from "./syncwatch"
import lang from "../lang"
import { page } from "../state"
import options from "../options"

// Base post view class
export default class PostView extends ImageHandler {
    constructor(model: Post, el: HTMLElement | null) {
        const attrs: ViewAttrs = { model }
        if (el) {
            attrs.el = el
        } else {
            attrs.class = 'post'
            if (model.editing) {
                attrs.class += ' editing'
            }
            if (model.deleted) {
                attrs.class += " deleted"
            }
            attrs.tag = "article"
            attrs.id = model.id.toString()
        }
        super(attrs)

        this.model.view = this
        if (!el) {
            this.el.append(importTemplate("article"))
            this.render()
            this.autoExpandImage()
        }
    }

    // Render the element contents, but don't insert it into the DOM
    public render() {
        if (this.model.subject) {
            const el = this.el.querySelector("h3")
            el.innerHTML = escape(this.model.subject)
            el.hidden = false
        }

        this.el.querySelector("blockquote").innerHTML = parseBody(this.model)
        if (this.model.backlinks) {
            this.renderBacklinks()
        }
        if (this.model.banned) {
            this.renderBanned()
        }
        this.renderHeader()
        if (this.model.image) {
            this.renderImage(false)
        }
    }

    // Get the current Element for text to be written to
    private buffer(): Element {
        const { state: { spoiler, quote } } = this.model
        let buf = this.el.querySelector("blockquote") as Element
        if (quote) {
            buf = buf.lastElementChild
        }
        if (spoiler) {
            buf = buf.lastElementChild
        }
        return buf
    }

    // check if we can see the post or have scrolled past it
    public scrolledPast() {
        const rect = this.el.getBoundingClientRect(),
            viewW = document.documentElement.clientWidth,
            viewH = document.documentElement.clientHeight;
        return rect.bottom < viewH && rect.left > 0 && rect.left < viewW
    }

    // Replace the current body with a reparsed fragment
    public reparseBody() {
        const bq = this.el.querySelector("blockquote")
        bq.innerHTML = ""
        bq.append(makeFrag(parseBody(this.model)))
        if (this.model.state.haveSyncwatch) {
            findSyncwatches(this.el)
        }
    }

    // Append a string to the current text buffer
    public appendString(s: string) {
        this.buffer().append(s)
    }

    // Remove one character from the current buffer
    public backspace() {
        const buf = this.buffer()
        // Merge multiple successive nodes created by appendString()
        buf.normalize()
        buf.innerHTML = buf.innerHTML.slice(0, -1)
    }

    // Render links to posts linking to this post
    public renderBacklinks() {
        // Find backlink span or create one
        let el = firstChild(this.el, ch =>
            ch.classList.contains("backlinks"))
        if (!el) {
            el = document.createElement("span")
            el.classList.add("spaced", "backlinks")
            this.el.append(el)
        }

        // Get already rendered backlink IDs
        const rendered = new Set<number>()
        for (let em of Array.from(el.children)) {
            const id = (em.firstChild as HTMLElement).getAttribute("data-id")
            rendered.add(parseInt(id))
        }

        let html = ""
        for (let idStr in this.model.backlinks) {
            const id = parseInt(idStr)
            // Confirm link not already rendered
            if (rendered.has(id)) {
                continue
            }
            rendered.add(id)
            html += "<em>"
                + renderPostLink(id, this.model.backlinks[id])
                + "</em>"
        }

        el.append(makeFrag(html))
    }

    // Render the header on top of the post
    protected renderHeader() {
        this.renderTime()
        this.renderName()
        if (this.model.sticky) {
            this.renderSticky()
        }

        const nav = this.el.querySelector("nav"),
            link = nav.firstElementChild as HTMLAnchorElement,
            quote = nav.lastElementChild as HTMLAnchorElement,
            { id } = this.model
        let url = `#${id}`
        if (!page.thread && !page.catalog) {
            url = `/all/${id}?last=100` + url
        }
        quote.href = link.href = url
        quote.textContent = id.toString()
    }

    // Renders a time element. Can be either absolute or relative.
    public renderTime() {
        let text = this.readableTime()
        const el = this.el.querySelector("time")
        if (options.relativeTime) {
            el.setAttribute("title", text)
            text = relativeTime(this.model.time)
        }
        el.textContent = text
    }

    // Renders classic absolute timestamp
    private readableTime(): string {
        const d = new Date(this.model.time * 1000)
        return `${pad(d.getDate())} ${lang.time.calendar[d.getMonth()]} `
            + `${d.getFullYear()} (${lang.time.week[d.getDay()]}) `
            + `${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    // Close an open post and clean up
    public closePost() {
        this.setEditing(false)
        this.reparseBody()
    }

    // Render the name and tripcode in the header
    public renderName() {
        const el = this.el.querySelector(".name")
        if (options.anonymise) {
            el.innerHTML = lang.posts["anon"]
            return
        }

        let html = ""
        const { trip, name, auth, sage } = this.model

        if (name || !trip) {
            if (name) {
                html += escape(name)
            } else {
                html += lang.posts["anon"]
            }
            if (trip) {
                html += ' '
            }
        }

        if (trip) {
            html += `<code>!${escape(trip)}</code>`
        }
        if (auth) { // Render staff title
            el.classList.add("admin")
            html += ` ## ${lang.posts[auth] || "??"}`
        }
        el.classList.toggle("sage", !!sage)
        el.innerHTML = html
    }

    // Render "USER WAS BANNED FOR THIS POST" message
    public renderBanned() {
        const el = firstChild(this.el.querySelector(".post-container"), el =>
            el.classList.contains("banned"))
        if (el) {
            return
        }

        const b = document.createElement("b")
        b.classList.add("admin", "banned")
        b.innerText = lang.posts["banned"]
        this.el.querySelector("blockquote").after(b)
    }

    // Add or remove highlight to post
    public setHighlight(on: boolean) {
        this.el.classList.toggle("highlight", on)
    }

    // Set display as an open post, that is being edited
    public setEditing(on: boolean) {
        this.el.classList.toggle("editing", on)
    }

    // Render indications that a post had been deleted
    public renderDeleted() {
        this.el.classList.add("deleted")
    }

    // Render the sticky status of a thread OP
    public renderSticky() {
        const old = this.el.querySelector(".sticky")
        if (old) {
            old.remove()
        }
        if (this.model.sticky) {
            this.el
                .querySelector(".mod-checkbox")
                .after(importTemplate("sticky"))
        }
    }

    // Inserts PostView back into the thread ordered by id
    public reposition() {
        // Insert before first post with greater ID
        const { id, op } = this.model,
            sec = document.querySelector(`section[data-id="${op}"]`)
        if (!sec) {
            return
        }
        for (let el of Array.from(sec.children)) {
            switch (el.tagName) {
                case "ARTICLE":
                    if (getID(el) > id) {
                        el.before(this.el)
                        return
                    }
                    break
                case "ASIDE": // On board pages
                    el.before(this.el)
                    return
            }
        }

        // This post should be last or no posts in thread
        sec.append(this.el)
    }
}
