.PHONY: build

# Build leyline-web for the host platform from the sibling engine repo.
# This Makefile lives in the fork target; the engine source is the sibling
# `leyline` monorepo (cmd/leyline-web), a self-contained module — no go.work.
# External forks without the sibling checkout install the leyline-web package instead.
build:
	@go -C ../leyline build -o $$PWD/leyline-web ./cmd/leyline-web

# Web deploy tooling for the retired frog03 box is archived in the private
# integration-tests repo (archive/frog/web/); no live deploy target, pending a
# replacement remote test box.
