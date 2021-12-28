# TODO: make this idempotent and cached
build:
	npm run dist

ebuild:
	earthly +build

start: build
	@/Applications/Joplin.app/Contents/MacOS/Joplin --env dev
