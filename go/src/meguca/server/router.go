package server

import (
	"log"
	"net/http"
	"meguca/auth"
	"meguca/util"
	"meguca/websockets"
	"github.com/dimfeld/httptreemux"
)

func startWebServer() (err error) {
	r := createRouter()
	log.Println("listening on " + address)
	err = http.ListenAndServe(address, r)
	if err != nil {
		return util.WrapError("error starting web server", err)
	}
	return
}

// Create the monolithic router for routing HTTP requests. Separated into own
// function for easier testability.
func createRouter() http.Handler {
	r := httptreemux.NewContextMux()
	r.NotFoundHandler = func(w http.ResponseWriter, _ *http.Request) {
		text404(w)
	}
	r.PanicHandler = text500

	// HTML
	r.GET("/", serveLanding)
	r.GET("/:board/", func(w http.ResponseWriter, r *http.Request) {
		boardHTML(w, r, extractParam(r, "board"), false)
	})
	r.GET("/:board/catalog", func(w http.ResponseWriter, r *http.Request) {
		boardHTML(w, r, extractParam(r, "board"), true)
	})
	// Needs override, because it conflicts with crossRedirect
	r.GET("/all/catalog", func(w http.ResponseWriter, r *http.Request) {
		// Artificially set board to "all"
		boardHTML(w, r, "all", true)
	})
	r.GET("/:board/:thread", threadHTML)
	r.GET("/all/:id", crossRedirect)

	// HTML partials
	// TODO(Kagami): Remove.
	html := r.NewGroup("/html")
	// html.GET("/board-navigation", boardNavigation)
	html.GET("/owned-boards/:userID", ownedBoardSelection)
	html.GET("/create-board", boardCreationForm)
	html.GET("/change-password", changePasswordForm)
	html.GET("/captcha", renderCaptcha)
	html.POST("/configure-board/:board", boardConfigurationForm)
	html.POST("/configure-server", serverConfigurationForm)
	html.GET("/assign-staff/:board", staffAssignmentForm)
	html.GET("/set-banners", bannerSettingForm)
	html.GET("/bans/:board", banList)
	html.GET("/mod-log/:board", modLog)

	// JSON API
	api := r.NewGroup("/api")
	api.GET("/socket", websockets.Handler)
	api.GET("/post/:post", servePost)
	api.POST("/post/token", createPostToken)
	// TODO(Kagami): Use single route?
	api.POST("/thread", createThread)
	api.POST("/post", createPost)
	// TODO(Kagami): Remove.
	// api.POST("/upload", imager.NewImageUpload)
	// api.POST("/upload-hash", imager.UploadImageHash)
	// api.POST("/spoiler-image", modSpoilerImage)
	// TODO(Kagami): RESTify.
	api.POST("/register", register)
	api.POST("/login", login)
	api.POST("/logout", logout)
	api.POST("/logout-all", logoutAll)
	api.POST("/change-password", changePassword)
	api.POST("/board-config/:board", servePrivateBoardConfigs)
	api.POST("/configure-board/:board", configureBoard)
	// api.POST("/config", servePrivateServerConfigs)
	api.POST("/configure-server", configureServer)
	api.POST("/create-board", createBoard)
	// api.POST("/delete-board", deleteBoard)
	api.POST("/delete-post", deletePost)
	api.POST("/delete-image", deleteImage)
	api.POST("/ban", ban)
	api.POST("/unban/:board", unban)
	api.POST("/assign-staff", assignStaff)
	// api.POST("/notification", sendNotification)
	// api.POST("/same-IP/:id", getSameIPPosts)
	// api.POST("/sticky", setThreadSticky)
	// api.POST("/set-banners", setBanners)
	// Captcha API
	captcha := api.NewGroup("/captcha")
	captcha.GET("/new", auth.NewCaptchaID)
	captcha.GET("/image/*path", auth.ServeCaptcha)
	// Noscript captcha API
	NSCaptcha := captcha.NewGroup("/noscript")
	NSCaptcha.GET("/load", noscriptCaptchaLink)
	NSCaptcha.GET("/new", noscriptCaptcha)
	// TODO(Kagami): Refactor.
	// json := r.NewGroup("/json")
	// boards := json.NewGroup("/boards")
	// boards.GET("/:board/", func(w http.ResponseWriter, r *http.Request) {
	// 	boardJSON(w, r, false)
	// })
	// boards.GET("/:board/catalog", func(w http.ResponseWriter, r *http.Request) {
	// 	boardJSON(w, r, true)
	// })
	// boards.GET("/:board/:thread", threadJSON)
	// json.GET("/config", serveConfigs)
	// json.GET("/extensions", serveExtensionMap)
	// json.GET("/board-config/:board", serveBoardConfigs)
	// json.GET("/board-list", serveBoardList)

	// Assets
	r.GET("/banners/:board/:id", serveBanner)
	r.GET("/uploads/*path", serveImages)
	r.GET("/static/*path", serveStatic)
	// r.GET("/worker.js", serveWorker)

	h := http.Handler(r)
	return h
}
