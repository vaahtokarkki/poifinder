#!/bin/bash
#
# Hold the server back until there is a database for it to serve.
#
# In the two container layout the serving container starts with an empty /db and
# the importer fills it later, which are minutes apart at best and hours apart on
# a new machine covering a continent. Without this, supervisord starts the
# dispatcher immediately, the dispatcher exits because /db/db is not there, and
# after four goes in eight seconds supervisor gives up for good:
#
#   find: '/db/db': No such file or directory
#   WARN exited: overpass_dispatch (exit status 1; not expected)
#   INFO gave up: overpass_dispatch entered FATAL state, too many start retries
#
# FATAL is forever. The database appearing half an hour later does not bring it
# back, so the container sits there with nginx answering 504 until something
# restarts it. update-poi-db does restart it, which is why this self healed, but
# a server that is only well because another container remembered to kick it is
# not a server anyone should have to reason about.
#
# So: wait here instead, before supervisord is ever started, and come up on our
# own the moment a database exists. The entrypoint runs the hooks in this
# directory on every start, and this one costs nothing once /db/db is there.
#
# The wait is deliberately unbounded. There is no useful thing to do after
# giving up, and a container that is plainly still waiting is easier to read
# than one that has failed for a reason you have to go and look up.

set -euo pipefail

# Not in the container that builds the database itself. Under init or clone the
# entrypoint creates /db/db a few lines after this hook runs, so waiting for it
# here would be waiting for something only we could unblock
case "${OVERPASS_MODE:-}" in
init | clone)
	exit 0
	;;
esac

if [[ -d /db/db ]]; then
	exit 0
fi

echo "30-wait-for-database.sh: no database at /db/db"
echo "30-wait-for-database.sh: waiting for one. Build it with:"
echo "30-wait-for-database.sh:   docker compose -f docker-compose.prod.yml exec importer update-poi-db"

WAITED=0
INTERVAL=10
while [[ ! -d /db/db ]]; do
	sleep "$INTERVAL"
	WAITED=$((WAITED + INTERVAL))
	# Once a minute, so the log says the container is alive and waiting rather
	# than alive and stuck, without becoming the only thing in it
	if ((WAITED % 60 == 0)); then
		echo "30-wait-for-database.sh: still waiting, $((WAITED / 60)) min"
	fi
done

# The importer swaps the finished database in with a rename, so the directory
# turns up complete rather than filling up while we watch it
echo "30-wait-for-database.sh: database found after $((WAITED / 60)) min, starting the server"
