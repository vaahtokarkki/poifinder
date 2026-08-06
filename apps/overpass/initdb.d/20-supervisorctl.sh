#!/bin/bash
#
# Give supervisorctl a socket to talk to.
#
# The image's supervisord.conf declares the processes but no control interface,
# so `supervisorctl stop overpass_dispatch` has nothing to connect to. That is
# exactly what update-poi-db needs when it swaps the rebuilt database in: the
# dispatcher has to go down and come back under supervisor's control, not be
# killed and restarted behind its back.
#
# Appending is deliberate. Shipping our own copy of supervisord.conf would
# quietly freeze the process list at whatever the image had on the day we
# copied it.

set -euo pipefail

CONFIG=/etc/supervisor/conf.d/supervisord.conf

if grep -q "^\[supervisorctl\]" "$CONFIG"; then
	exit 0
fi

cat >>"$CONFIG" <<'EOF'

; Added by apps/overpass/initdb.d/20-supervisorctl.sh
[unix_http_server]
file=/var/run/supervisor.sock
chmod=0700

[supervisorctl]
serverurl=unix:///var/run/supervisor.sock

[rpcinterface:supervisor]
; A colon, not a dot: the value is a setuptools entry point, module:attribute
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface
EOF

echo "20-supervisorctl.sh: supervisorctl enabled"
