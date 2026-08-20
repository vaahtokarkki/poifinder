#!/bin/bash
#
# Write an access log that outlives the container, and rotate it.
#
# The image logs every request to /var/log/nginx/access.log, which is a symlink
# to /dev/stdout: the lines end up in the Docker log, capped at 30 MB and
# thrown away with the container. Watchtower replaces this container whenever a
# new image is pushed, so that is not a record anyone can go back to.
#
# So the requests go to a file on the /db volume instead, in JSON, one object
# per line — `jq` reads it, and no field can break the format however odd the
# user agent is. logrotate keeps ten days of it, which is the whole retention
# policy: what is worth knowing about traffic is knowable within days, and an
# IP address is personal data that there is no reason to keep for longer.
#
# Two things are worth knowing about the fields:
#
#   ip     is the client, not the tunnel. Nothing reaches this container except
#          through whatever terminates TLS on the host, so without real_ip
#          every line would say 172.17.0.1. See the trusted ranges below.
#   query  is the Overpass QL the app posted, which is what says *what* was
#          asked for — the categories, the radius, the map area. nginx can only
#          log a body it still has in memory, so this is empty for a query
#          above client_body_buffer_size (a large polygon search); the rest of
#          the line is written either way.
#
# Runs from /docker-entrypoint-initdb.d on every start, after 10-cors.sh has
# regenerated the template and before the entrypoint renders nginx.conf from
# it. Set WAYSIDE_ACCESS_LOG=false to turn the whole thing off.

set -euo pipefail

TEMPLATE=/etc/nginx/nginx.conf.template
SUPERVISOR_CONFIG=/etc/supervisor/conf.d/supervisord.conf
LOGROTATE_CONFIG=/etc/logrotate.d/wayside-access-log

ENABLED=${WAYSIDE_ACCESS_LOG:-true}
LOG_DIR=${WAYSIDE_ACCESS_LOG_DIR:-/db/logs}
LOG_FILE="${LOG_DIR}/access.log"
DAYS=${WAYSIDE_ACCESS_LOG_DAYS:-10}

if [[ $ENABLED != "true" ]]; then
	echo "15-access-log.sh: disabled (WAYSIDE_ACCESS_LOG=${ENABLED}), requests go to the Docker log only"
	exit 0
fi

# nginx workers run as nginx and open the file themselves. /db above it is 0711
# (see 05-db-permissions.sh), which is enough to traverse
mkdir -p "$LOG_DIR"
chown nginx:nginx "$LOG_DIR"
chmod 0755 "$LOG_DIR"

# The template is patched, not replaced: this adds to whatever the image ships
# and to what 10-cors.sh has already put in, and both anchors are checked so a
# changed upstream config stops the container rather than quietly serving with
# no access log
if ! awk -v log_file="$LOG_FILE" '
	{ print }

	/^http \{/ {
		http_found = 1
		print ""
		print "    # Added by initdb.d/15-access-log.sh"
		print "    #"
		print "    # The address that connected is the tunnel or reverse proxy on the"
		print "    # host, reaching us over the Docker bridge, so the client is only ever"
		print "    # in X-Forwarded-For. These ranges are the private ones the bridge and"
		print "    # the loopback proxy can appear on; nothing public is trusted to name"
		print "    # its own address, and nothing public can reach this port anyway"
		print "    set_real_ip_from 127.0.0.1;"
		print "    set_real_ip_from ::1;"
		print "    set_real_ip_from 10.0.0.0/8;"
		print "    set_real_ip_from 172.16.0.0/12;"
		print "    set_real_ip_from 192.168.0.0/16;"
		print "    set_real_ip_from fc00::/7;"
		print "    real_ip_header X-Forwarded-For;"
		print "    real_ip_recursive on;"
		print ""
		print "    # escape=json is what makes this safe to write as JSON: a quote or a"
		print "    # newline in a user agent is escaped rather than ending the string"
		print "    log_format wayside_json escape=json"
		print "        \x27{\x27"
		print "        \x27\"time\":\"$time_iso8601\",\x27"
		print "        \x27\"ip\":\"$remote_addr\",\x27"
		print "        \x27\"proxy_ip\":\"$realip_remote_addr\",\x27"
		print "        \x27\"xff\":\"$http_x_forwarded_for\",\x27"
		print "        \x27\"country\":\"$http_cf_ipcountry\",\x27"
		print "        \x27\"method\":\"$request_method\",\x27"
		print "        \x27\"uri\":\"$request_uri\",\x27"
		print "        \x27\"status\":$status,\x27"
		print "        \x27\"bytes\":$body_bytes_sent,\x27"
		print "        \x27\"request_length\":$request_length,\x27"
		print "        \x27\"duration\":$request_time,\x27"
		print "        \x27\"referer\":\"$http_referer\",\x27"
		print "        \x27\"ua\":\"$http_user_agent\",\x27"
		print "        \x27\"query\":\"$request_body\"\x27"
		print "        \x27}\x27;"
		print ""
		print "    # The health check runs curl inside the container once a minute. It is"
		print "    # the only thing that can reach nginx from the loopback address, so"
		print "    # this drops it and nothing else"
		print "    map $realip_remote_addr $wayside_log_request {"
		print "        default    1;"
		print "        \"127.0.0.1\" 0;"
		print "        \"::1\"       0;"
		print "    }"
	}

	/^[[:space:]]*server[[:space:]]*\{/ {
		server_found = 1
		# An access_log here replaces the one inherited from http, which is the
		# symlink to stdout: the requests move to the file rather than being
		# written twice. Everything else in the Docker log — the dispatcher,
		# the importer, nginx errors — is untouched
		print "\t\taccess_log " log_file " wayside_json if=$wayside_log_request;"
	}

	END { if (!http_found || !server_found) exit 1 }
' "$TEMPLATE" >"${TEMPLATE}.new"; then
	echo "15-access-log.sh: could not find the http or server block in $TEMPLATE" >&2
	rm -f "${TEMPLATE}.new"
	exit 1
fi

mv "${TEMPLATE}.new" "$TEMPLATE"

# dateext, so a file says which day it holds rather than how many rotations ago
# it was: access.log-2026-08-20.gz is what you want when looking for a day.
# delaycompress leaves the newest rotation uncompressed for a cycle, because
# nginx keeps writing to the old file until the USR1 below reaches it
cat >"$LOGROTATE_CONFIG" <<EOF
# Generated by initdb.d/15-access-log.sh on container start. Edit that.
${LOG_FILE} {
	daily
	rotate ${DAYS}
	dateext
	dateformat -%Y-%m-%d
	missingok
	notifempty
	compress
	delaycompress
	create 0640 nginx nginx
	postrotate
		[ -f /var/run/nginx.pid ] && kill -USR1 "\$(cat /var/run/nginx.pid)"
	endscript
}
EOF

# supervisor is what runs the rotation, because the image has no cron. Appended
# for the same reason 20-supervisorctl.sh appends: shipping our own copy of
# supervisord.conf would freeze the image's process list at today's version
if ! grep -q "^\[program:wayside_logrotate\]" "$SUPERVISOR_CONFIG"; then
	cat >>"$SUPERVISOR_CONFIG" <<'EOF'

; Added by apps/overpass/initdb.d/15-access-log.sh
[program:wayside_logrotate]
command=/usr/local/bin/rotate-access-log
priority=8
redirect_stderr=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
autorestart=true
EOF
fi

echo "15-access-log.sh: access log at ${LOG_FILE}, ${DAYS} days"
