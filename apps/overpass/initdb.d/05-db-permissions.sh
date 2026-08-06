#!/bin/bash
#
# Let the FastCGI worker reach the dispatcher.
#
# The image creates /db as the overpass user's home directory, and adduser
# makes a home 0700. The dispatcher runs as overpass and puts its socket in
# /db/db, but the process that answers queries runs as nginx, and cannot even
# traverse /db to get to it. Every query then comes back as
#
#   runtime error: open64: 13 Permission denied /db/db//osm3s_osm_base
#
# 0711 rather than 0755: traversal is all that is needed, and the directory
# also holds the cookie jar used for authenticated downloads.
#
# Runs on every start, so a volume created before this existed is fixed too.

set -euo pipefail

if [[ $(stat -c %a /db) != "711" ]]; then
	chmod 0711 /db
	echo "05-db-permissions.sh: /db is now $(stat -c %a /db)"
fi

# Nothing else in there is for anyone but overpass
if [[ -f /db/cookie.jar ]]; then
	chmod 0600 /db/cookie.jar
fi
