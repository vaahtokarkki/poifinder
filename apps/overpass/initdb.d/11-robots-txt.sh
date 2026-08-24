#!/bin/bash
#
# Answer robots.txt, so crawlers stop guessing.
#
# There is no robots.txt on this host, so every crawler that looks for one gets
# a 404 — 21 of them over five days, from Applebot, Googlebot, AhrefsBot and
# facebookexternalhit. A 404 means "no restrictions", so they go on to render
# the app and call the interpreter: Applebot alone accounted for 265 API
# queries in that window, which is more than every real visitor put together
# on a quiet day.
#
# Nothing here is a crawlable page. This host answers one POST endpoint; the
# site itself is on Cloudflare and has its own robots.txt. So the answer is
# "none of it", to everybody.
#
# What that costs, and why it is nothing: a crawler that respects this will not
# fetch the interpreter while rendering wayside.cc, so its view of a city page
# is the page without live markers on the map. The text a crawler indexes —
# the counts, the category links, the neighbouring cities — is built into the
# prerendered HTML from apps/frontend/src/seo/pageData.ts and rendered by
# CityPageSection from that same build-time data, with no request to this
# server anywhere in it. The map markers were never indexable.
#
# Runs from /docker-entrypoint-initdb.d on every start, after 10-cors.sh has
# regenerated the template. Set WAYSIDE_ROBOTS_TXT=false to go back to a 404.

set -euo pipefail

TEMPLATE=/etc/nginx/nginx.conf.template
ENABLED=${WAYSIDE_ROBOTS_TXT:-true}

if [[ $ENABLED != "true" ]]; then
	echo "11-robots-txt.sh: disabled (WAYSIDE_ROBOTS_TXT=${ENABLED}), robots.txt keeps 404ing"
	exit 0
fi

if ! awk '
	{ print }

	/^[[:space:]]*server[[:space:]]*\{/ {
		found = 1
		print "\t\t# Added by initdb.d/11-robots-txt.sh"
		print "\t\t#"
		print "\t\t# An API host with nothing to crawl. always, because a 404 from"
		print "\t\t# this location would otherwise be read as permission"
		print "\t\tlocation = /robots.txt {"
		print "\t\t\tadd_header Content-Type text/plain always;"
		print "\t\t\treturn 200 \"User-agent: *\\nDisallow: /\\n\";"
		print "\t\t}"
	}

	END { if (!found) exit 1 }
' "$TEMPLATE" >"${TEMPLATE}.new"; then
	echo "11-robots-txt.sh: could not find the server block in $TEMPLATE" >&2
	rm -f "${TEMPLATE}.new"
	exit 1
fi

mv "${TEMPLATE}.new" "$TEMPLATE"
echo "11-robots-txt.sh: robots.txt disallows everything"
