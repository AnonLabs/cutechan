export GULP=$(PWD)/node_modules/.bin/gulp
ifeq ($(GOPATH),)
	export PATH:=$(PATH):$(PWD)/go/bin
	export GOPATH=$(PWD)/go
	export TMPDIR=$(PWD)/go
else
	export PATH:=$(PATH):$(GOPATH)/bin
	export GOPATH:=$(GOPATH):$(PWD)/go
endif

.PHONY: client tags

all: client server

client: client-deps client-build

client-deps:
	npm install --progress=false

client-build:
	$(GULP)

watch:
	$(GULP) -w

server: server-deps server-build

server-deps:
	go get -v \
		github.com/valyala/quicktemplate/qtc \
		github.com/jteeuwen/go-bindata/... \
		github.com/mailru/easyjson/...
	go list -f '{{.Deps}}' meguca | tr -d '[]' | xargs go get -v

server-build:
	go generate meguca/...
	go build -v -o cutechan meguca

update-deps:
	go get -u -v \
		github.com/valyala/quicktemplate/qtc \
		github.com/jteeuwen/go-bindata/... \
		github.com/mailru/easyjson/...
	go list -f '{{.Deps}}' meguca |\
		tr -d '[]' |\
		xargs go list -e -f '{{if not .Standard}}{{.ImportPath}}{{end}}' |\
		grep -v meguca |\
		xargs go get -u -v
	npm update

test:
	go test -race -p 1 meguca/...

test-no-race:
	go test -p 1 meguca/...

test-custom:
	go test meguca/... $(f)

test-build:
	go build -o /dev/null meguca

tags:
	ctags -R go/src/meguca client

clean: client-clean server-clean test-clean

client-clean:
	rm -rf dist

server-clean:
	rm -rf cutechan \
		go/src/meguca/**/bin_data.go \
		go/src/meguca/common/*_easyjson.go \
		go/src/meguca/config/*_easyjson.go \
		go/src/meguca/templates/*.qtpl.go

test-clean:
	rm -rf go/multipart-* \
		go/src/meguca/imager/uploads \
		go/src/meguca/imager/assets/uploads \
		go/src/meguca/imager/testdata/thumb_*.jpg \
		go/src/meguca/imager/testdata/thumb_*.png

distclean: clean
	rm -rf uploads
	rm -rf node_modules package-lock.json
	rm -rf go/src/github.com go/src/golang.org go/bin go/pkg
