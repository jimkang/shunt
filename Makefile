MOCHA = $(shell pwd)/node_modules/.bin/mocha

test:
	$(MOCHA) --ui tdd -R spec tests/shunttests.js
