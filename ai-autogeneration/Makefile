.PHONY: build install clean test

BINARY = ai
PREFIX ?= /usr/local/bin

build:
	go build -o $(BINARY) .

install: build
	cp $(BINARY) $(PREFIX)/$(BINARY)

clean:
	rm -f $(BINARY)

test:
	go test ./...
