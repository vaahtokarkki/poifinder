#!/bin/bash
#
# Decide who may read the answers, in the browser's terms.
#
# The interpreter already sends `Access-Control-Allow-Origin: *` of its own
# accord, which is why the public mirrors work from a web page at all. Two
# things are wrong with leaving it at that: the value cannot be changed, and a
# response nginx produces on its own (a timeout, a 502) carries no CORS header
# and so reaches the app as an unexplained network error.
#
# So the interpreter's headers are hidden and ours are set instead. Sending
# both would be worse than sending neither: a browser rejects a response that
# names two allowed origins, even when they agree.
#
# Runs from /docker-entrypoint-initdb.d on every container start, before the
# entrypoint renders nginx.conf from this template.

set -euo pipefail

TEMPLATE=/etc/nginx/nginx.conf.template
PRISTINE="${TEMPLATE}.pristine"
ORIGIN=${OVERPASS_CORS_ORIGIN:-*}

# Patch the image's copy, never our own output: a restart with a different
# OVERPASS_CORS_ORIGIN has to replace the header rather than add a second one
if [[ ! -f $PRISTINE ]]; then
	cp "$TEMPLATE" "$PRISTINE"
fi

# Better to refuse to start than to serve an API no browser can read, so the
# awk fails when the location it patches is not where it used to be
if ! awk -v origin="$ORIGIN" '
	{ print }
	/location \/cgi-bin\/ \{/ {
		found = 1
		print "            fastcgi_hide_header Access-Control-Allow-Origin;"
		print "            fastcgi_hide_header Access-Control-Allow-Methods;"
		print "            fastcgi_hide_header Access-Control-Allow-Headers;"
		print "            fastcgi_hide_header Access-Control-Max-Age;"
		print "            add_header Access-Control-Allow-Origin \"" origin "\" always;"
		print "            add_header Access-Control-Allow-Methods \"GET, POST, OPTIONS\" always;"
		print "            add_header Access-Control-Allow-Headers \"Content-Type\" always;"
		print "            add_header Access-Control-Max-Age 600 always;"
		# A preflight must not reach the interpreter: there is no query in it.
		# The headers are repeated because add_header inside an if block
		# replaces the ones outside it rather than adding to them
		print "            if ($request_method = OPTIONS) {"
		print "                add_header Access-Control-Allow-Origin \"" origin "\" always;"
		print "                add_header Access-Control-Allow-Methods \"GET, POST, OPTIONS\" always;"
		print "                add_header Access-Control-Allow-Headers \"Content-Type\" always;"
		print "                add_header Access-Control-Max-Age 600 always;"
		print "                return 204;"
		print "            }"
	}
	END { if (!found) exit 1 }
' "$PRISTINE" >"${TEMPLATE}.new"; then
	echo "10-cors.sh: could not find the /cgi-bin/ location in $PRISTINE" >&2
	rm -f "${TEMPLATE}.new"
	exit 1
fi

mv "${TEMPLATE}.new" "$TEMPLATE"
echo "10-cors.sh: Access-Control-Allow-Origin: ${ORIGIN}"
