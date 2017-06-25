export node_bins=$(PWD)/node_modules/.bin
export uglifyjs=$(node_bins)/uglifyjs
export gulp=$(node_bins)/gulp
export is_windows=false
binary=meguca
ifeq ($(GOPATH),)
	export PATH:=$(PATH):$(PWD)/go/bin
	export GOPATH=$(PWD)/go
	export TMPDIR=$(PWD)/go
else
	export PATH:=$(PATH):$(GOPATH)/bin
	export GOPATH:=$(GOPATH):$(PWD)/go
endif

# Differentiate between Unix and mingw builds
ifeq ($(OS), Windows_NT)
	export PKG_CONFIG_PATH:=$(PKG_CONFIG_PATH):/mingw64/lib/pkgconfig/
	export PKG_CONFIG_LIBDIR=/mingw64/lib/pkgconfig/
	export PATH:=$(PATH):/mingw64/bin/
	export is_windows=true
	binary=meguca.exe
endif

.PHONY: server client imager test

all: server client

client: client_vendor
	$(gulp)

client_deps:
	npm install --progress false --depth 0

watch:
	$(gulp) -w

client_vendor: client_deps
	mkdir -p www/js/vendor
	cp node_modules/dom4/build/dom4.js node_modules/core-js/client/core.min.js node_modules/core-js/client/core.min.js.map node_modules/babel-polyfill/dist/polyfill.min.js node_modules/proxy-polyfill/proxy.min.js www/js/vendor
	$(uglifyjs) node_modules/whatwg-fetch/fetch.js -o www/js/vendor/fetch.js
	$(uglifyjs) node_modules/almond/almond.js -o www/js/vendor/almond.js

server: generate server_deps server_build

generate:
	go get -v github.com/valyala/quicktemplate/qtc github.com/jteeuwen/go-bindata/... github.com/mailru/easyjson/...
	rm -f go/src/meguca/common/*_easyjson.go
	rm -f go/src/meguca/config/*_easyjson.go
	rm -f go/src/meguca/templates/*.qtpl.go
	go generate meguca/...

server_deps:
	go list -f '{{.Deps}}' meguca | tr -d '[]' | xargs go get -v

server_build:
	go build -v -o $(binary) meguca
ifeq ($(is_windows), true)
	cp /mingw64/bin/*.dll ./
endif

update_deps:
	go get -u -v github.com/valyala/quicktemplate/qtc github.com/jteeuwen/go-bindata/... github.com/mailru/easyjson/...
	go list -f '{{.Deps}}' meguca | tr -d '[]' | xargs go list -e -f '{{if not .Standard}}{{.ImportPath}}{{end}}' | grep -v 'meguca' | xargs go get -u -v
	npm update

client_clean:
	rm -rf www/js www/css/*.css www/css/maps www/lang

server_clean:
	rm -rf go/src/github.com go/src/golang.org go/bin go/pkg

clean: client_clean server_clean
	rm -rf .build .ffmpeg .package meguca-*.zip meguca-*.tar.xz meguca meguca.exe
	$(MAKE) -C scripts/migration/3to4 clean
ifeq ($(is_windows), true)
	rm -rf /.meguca_build *.dll
endif

dist_clean: clean
	rm -rf images error.log

test:
	go test -race -p 1 meguca/...

test_no_race:
	go test -p 1 meguca/...

test_custom:
	go test meguca/... $(f)

test_clean:
	rm -rf go/multipart-*

upgrade_v4: generate
	go get -v github.com/dancannon/gorethink
	$(MAKE) -C scripts/migration/3to4 upgrade
