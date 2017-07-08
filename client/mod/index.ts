// Login/logout/registration facilities for the account system

import { postJSON, deleteCookie } from '../util'
import { FormView } from "../ui"
import { TabbedModal } from "../base"
import { showAlert } from "../alerts"
import { validatePasswordMatch } from "./common"
import ModPanel from "./panel"
import {
	PasswordChangeForm, ServerConfigForm, BoardConfigForm, BoardCreationForm,
	BoardDeletionForm, StaffAssignmentForm, BannerForm,
} from "./forms"

export { loginID, sessionToken } from "./common"

interface Constructable {
	new (): any
}

// Possible staff access levels
export const enum ModerationLevel {
	notLoggedIn = - 1,
	notStaff,
	janitor,
	moderator,
	boardOwner,
	admin,
}

// Current staff position on this page
export const position: ModerationLevel = (window as any).position

export function isStaff(): boolean {
	return position > ModerationLevel.notStaff
}

export function getMyAuth(): string {
	switch (position) {
	case ModerationLevel.admin:
		return "admin"
	case ModerationLevel.boardOwner:
		return "owners"
	case ModerationLevel.moderator:
		return "moderators"
	case ModerationLevel.janitor:
		return "janitors"
	default:
		return ""
	}
}

// Only active AccountPanel instance
export let accountPanel: AccountPanel

let loginForm: LoginForm,
	registrationForm: LoginForm

// Account login and registration
class AccountPanel extends TabbedModal {
	constructor() {
		super(document.getElementById("account-panel"))

		this.onClick({
			'#logout': () =>
				logout("/api/logout"),
			"#logoutAll": () =>
				logout("/api/logout-all"),
			"#changePassword": this.loadConditional(PasswordChangeForm),
			"#configureServer": this.loadConditional(ServerConfigForm),
			"#createBoard": this.loadConditional(BoardCreationForm),
			"#deleteBoard": this.loadConditional(BoardDeletionForm),
			"#configureBoard": this.loadConditional(BoardConfigForm),
			"#assignStaff": this.loadConditional(StaffAssignmentForm),
			"#setBanners": this.loadConditional(BannerForm),
		})

		if (position > ModerationLevel.notStaff) {
			new ModPanel()
		} else {
			this.tabHook = id => {
				switch (id) {
					case 0:
						loginForm.initCaptcha()
						break
					case 1:
						registrationForm.initCaptcha()
						break
				}
			}
			this.showHook = () => {
				if (position === ModerationLevel.notLoggedIn) {
					loginForm.initCaptcha()
				}
			}
		}
	}

	// Create handler for dynamically loading and rendering conditional view
	// modules
	private loadConditional(m: Constructable): EventListener {
		return () => {
			this.toggleMenu(false)
			new m()
		}
	}

	// Either hide or show the selection menu
	public toggleMenu(show: boolean) {
		document.getElementById("form-selection")
			.style
			.display = show ? "block" : "none"
	}
}

// Reset the views and module to its not-logged-id state
export function reset() {
	deleteCookie("loginID")
	deleteCookie("session")
}

// Terminate the user session(s) server-side and reset the panel
async function logout(url: string) {
	const res = await fetch(url, {
		method: "POST",
		credentials: "include",
	})
	switch (res.status) {
		case 200:
		case 403: // Does not really matter, if the session already expired
			location.reload(true)
			break
		default:
			showAlert(await res.text())
	}
}

// Common functionality of login and registration forms
class LoginForm extends FormView {
	private url: string

	constructor(id: string, url: string) {
		super({
			el: document.getElementById(id),
			lazyCaptcha: true,
		})
		this.url = "/api/" + url
	}

	// Extract and send login ID and password and captcha (if any) from a form
	protected async send() {
		const req: any = {}
		for (let key of ['id', 'password']) {
			req[key] = this.inputElement(key).value
		}
		this.injectCaptcha(req)

		const res = await postJSON(this.url, req)
		switch (res.status) {
			case 200:
				location.reload(true)
			default:
				this.renderFormResponse(await res.text())
		}
	}
}

// Init module.
export function init() {
	accountPanel = new AccountPanel()
	if (position === ModerationLevel.notLoggedIn) {
		loginForm = new LoginForm("login-form", "login")
		registrationForm = new LoginForm("registration-form", "register")
		validatePasswordMatch(registrationForm.el, "password", "repeat")
	}
}
