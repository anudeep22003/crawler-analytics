.PHONY: format check

format:
	npm run format

check:
	npm run format:check
	npm run typecheck
