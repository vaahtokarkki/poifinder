#!/bin/bash
#
# Bound what one client can ask for, and how often.
#
# There was nothing here before. OVERPASS_RATE_LIMIT is the dispatcher's
# --rate-limit, which caps *concurrent* queries from one address and says
# nothing about a client making them one after another as fast as it can; the
# only body size limit was the image's 1 MB default; and nginx would wait
# OVERPASS_MAX_TIMEOUT — three minutes — for an answer.
#
# Measured against five days of real traffic, none of these binds:
#
#   requests per second from one address   3 at the very worst, and that is our
#                                          own prerender during a deploy. Real
#                                          visitors peak at 2, and 15 a minute
#   request body                           556 bytes median, 1.6 KB at the 99th
#                                          percentile, 177 KB at the largest —
#                                          one route search, whose polygon is
#                                          the query
#   time to answer                         0.25 s median, 1.4 s at the 99th,
#                                          4.0 s at the very worst
#
# So the defaults below sit far above everything this app does and far below
# what a script could do unimpeded. The point is not to shape normal traffic,
# which needs no shaping; it is that nothing can run away.
#
# 429 rather than nginx's default 503, because the app already knows what a 429
# is: fetchWithRetry treats it as retryable and backs off. A 503 it would treat
# as the server being down and fail over to the public mirrors.
#
# Two things about *where* the limit goes, both of which were wrong first time
# and both of which a test caught:
#
#   /cgi-bin/ is made internal. It is the location that actually reaches the
#   dispatcher, and the image leaves it open to the world — so every limit put
#   on /api/ could be skipped by asking for /cgi-bin/interpreter instead, and
#   so could 13-query-guard.sh. Nothing outside needs it: /api/ has always been
#   the front door, and the rewrite that gets there is internal.
#
#   limit_req goes on the /api/ locations rather than on the server, because an
#   internal redirect runs the preaccess phase again. Declared once at the top,
#   a single request went through the limit twice — on /api/interpreter and
#   again on the /cgi-bin/interpreter it was rewritten to — and the effective
#   rate was half the configured one.
#
# Runs from /docker-entrypoint-initdb.d on every start, after 10-cors.sh has
# regenerated the template. Set WAYSIDE_RATE_LIMIT=0 to leave the rate alone.

set -euo pipefail

TEMPLATE=/etc/nginx/nginx.conf.template

# Requests per second per address, and how many may arrive at once before the
# limit is felt. `nodelay` so that a burst inside the allowance is answered at
# full speed rather than paced out — the app's own opening salvo is a handful
# of queries in a second and should not be slowed down
RATE=${WAYSIDE_RATE_LIMIT:-10}
BURST=${WAYSIDE_RATE_BURST:-20}

# The largest query accepted. The buffer matches it on purpose: a body larger
# than client_body_buffer_size is written to a temporary file, where neither
# the access log nor 13-query-guard.sh can read it, and a query that cannot be
# read is one that would have to be forwarded unexamined
MAX_BODY=${WAYSIDE_MAX_QUERY_SIZE:-256k}

if [[ $RATE == "0" ]]; then
	echo "12-request-limits.sh: rate limiting off (WAYSIDE_RATE_LIMIT=0)"
fi

if ! awk -v rate="$RATE" -v burst="$BURST" -v max_body="$MAX_BODY" '
	{ print }

	/^http \{/ {
		http_found = 1
		print ""
		print "    # Added by initdb.d/12-request-limits.sh"
		if (rate != "0") {
			print "    #"
			print "    # Keyed on the client rather than on the tunnel, which means this"
			print "    # has to be read after real_ip has replaced $remote_addr — it is,"
			print "    # limit_req runs well after the rewrite phase. 10m holds around"
			print "    # 160k addresses, far more than this ever sees"
			print "    limit_req_zone $binary_remote_addr zone=wayside_api:10m rate=" rate "r/s;"
			print "    limit_req_status 429;"
		}
		print "    client_max_body_size " max_body ";"
		print "    client_body_buffer_size " max_body ";"
	}

	# The front door for everything except /api/interpreter, which
	# 13-query-guard.sh takes over and limits itself
	/^[[:space:]]*location \/api\/ \{/ {
		api_found = 1
		if (rate != "0") {
			print "\t\t\tlimit_req zone=wayside_api burst=" burst " nodelay;"
		}
	}

	# What actually reaches the dispatcher. Internal, so /api/ is the only way
	# in and neither this limit nor the query guard can be walked around
	/^[[:space:]]*location \/cgi-bin\/ \{/ {
		cgi_found = 1
		print "\t\t\tinternal;"
	}

	END { if (!http_found || !api_found || !cgi_found) exit 1 }
' "$TEMPLATE" >"${TEMPLATE}.new"; then
	echo "12-request-limits.sh: could not find the http, /api/ or /cgi-bin/ block in $TEMPLATE" >&2
	rm -f "${TEMPLATE}.new"
	exit 1
fi

mv "${TEMPLATE}.new" "$TEMPLATE"
echo "12-request-limits.sh: ${RATE}r/s burst ${BURST} per address, bodies up to ${MAX_BODY}, /cgi-bin/ internal"
