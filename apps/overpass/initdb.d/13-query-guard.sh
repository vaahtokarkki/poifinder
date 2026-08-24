#!/bin/bash
#
# Put njs/query-guard.js in front of the interpreter.
#
# The guard itself is that file, and the reasoning for it is in its header.
# This is the wiring: load the module, point nginx at the script, and give
# /api/interpreter a handler that runs it before anything reaches the
# dispatcher.
#
# The interpreter keeps its own location under a name, so the guard hands the
# request on with an internal redirect rather than re-implementing the FastCGI
# it would otherwise have to. Method, body and arguments survive that, so what
# the dispatcher sees is what the client sent.
#
# The image's own `location /api/` rewrite is left exactly as it was, and still
# handles /api/anything-else. Only the interpreter is taken over here, because
# it is the only one that runs a query.
#
# A regex location rather than an exact one, so that /api/interpreter/ and
# anything else with that prefix goes through the guard too rather than falling
# through to the /api/ rewrite behind it. What the guard forwards to is the one
# canonical path, so the odd spellings are normalised on the way past.
#
# The other half of "cannot be walked around" is 12-request-limits.sh marking
# /cgi-bin/ internal. Without that, the guard is a front door beside an open
# window: POSTing straight to /cgi-bin/interpreter reaches the dispatcher with
# nothing looked at. This hook is not much use on its own.
#
# Runs from /docker-entrypoint-initdb.d on every start, after 10-cors.sh has
# regenerated the template. Two settings:
#
#   WAYSIDE_QUERY_GUARD=off    do not install it at all
#   WAYSIDE_QUERY_GUARD=log    install it, refuse nothing, write what it would
#                              have refused to the error log. Worth a few days
#                              before enforcing, on the chance this app grows a
#                              query shape the rules do not know about

set -euo pipefail

TEMPLATE=/etc/nginx/nginx.conf.template
MODULE=/usr/lib/nginx/modules/ngx_http_js_module.so
SCRIPT_DIR=/etc/nginx/njs
SCRIPT="${SCRIPT_DIR}/query-guard.js"

MODE=${WAYSIDE_QUERY_GUARD:-enforce}

if [[ $MODE == "off" ]]; then
	echo "13-query-guard.sh: disabled (WAYSIDE_QUERY_GUARD=off), every query reaches the interpreter"
	exit 0
fi

if [[ $MODE != "enforce" && $MODE != "log" ]]; then
	echo "13-query-guard.sh: WAYSIDE_QUERY_GUARD must be enforce, log or off (got ${MODE})" >&2
	exit 1
fi

# Both halves have to be there. Refusing to start is the right answer over
# quietly serving an unguarded interpreter that the operator believes is guarded
if [[ ! -f $MODULE ]]; then
	echo "13-query-guard.sh: ${MODULE} is not in this image" >&2
	exit 1
fi
if [[ ! -f $SCRIPT ]]; then
	echo "13-query-guard.sh: ${SCRIPT} is missing, is the Dockerfile still copying njs/?" >&2
	exit 1
fi

# The rate limit is applied here rather than inherited, so it is applied once.
# Lifted from whatever 12-request-limits.sh put on /api/ so the two cannot drift,
# and left out when that hook is off or disabled — naming a zone that was never
# declared is a config nginx refuses to start on
# `|| true` because no match is the normal answer when WAYSIDE_RATE_LIMIT=0,
# and `set -e` would otherwise take a turned-off rate limit as a failure here
LIMIT=$(grep -o 'limit_req zone=wayside_api[^;]*;' "$TEMPLATE" | head -1 || true)
if [[ -n $LIMIT ]] && ! grep -q 'limit_req_zone .*zone=wayside_api' "$TEMPLATE"; then
	LIMIT=""
fi

if ! awk -v mode="$MODE" -v module="$MODULE" -v script_dir="$SCRIPT_DIR" -v limit="$LIMIT" '
	NR == 1 {
		print "# Added by initdb.d/13-query-guard.sh"
		print "load_module " module ";"
		print ""
	}

	{ print }

	/^http \{/ {
		http_found = 1
		print ""
		print "    # Added by initdb.d/13-query-guard.sh"
		print "    js_path " script_dir "/;"
		print "    js_import wayside from query-guard.js;"
	}

	/^[[:space:]]*server[[:space:]]*\{/ {
		server_found = 1
		print "\t\t# Added by initdb.d/13-query-guard.sh"
		print "\t\t#"
		print "\t\t# Read by the guard to decide whether a refusal is a 403 or a line"
		print "\t\t# in the error log"
		print "\t\tset $wayside_guard_mode \"" mode "\";"
		print ""
		print "\t\tlocation ~ ^/api/interpreter {"
		if (limit != "") {
			print "\t\t\t# The limit lives here rather than on the server, so that the"
			print "\t\t\t# internal redirect below is not counted as a second request."
			print "\t\t\t# See 12-request-limits.sh, which defines the zone"
			print "\t\t\t" limit
		}
		print "\t\t\tjs_content wayside.guard;"
		print "\t\t}"
		print ""
		print "\t\t# Where the guard sends a query it is happy with. A named location,"
		print "\t\t# so nothing outside can name it and skip the guard"
		print "\t\tlocation @wayside_interpreter {"
		print "\t\t\trewrite ^ /cgi-bin/interpreter last;"
		print "\t\t}"
	}

	END { if (!http_found || !server_found) exit 1 }
' "$TEMPLATE" >"${TEMPLATE}.new"; then
	echo "13-query-guard.sh: could not find the http or server block in $TEMPLATE" >&2
	rm -f "${TEMPLATE}.new"
	exit 1
fi

mv "${TEMPLATE}.new" "$TEMPLATE"
echo "13-query-guard.sh: guarding /api/interpreter (mode: ${MODE}${LIMIT:+, rate limited})"
