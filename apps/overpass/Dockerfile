# Overpass API holding only the tags this app queries.
#
# Everything the server needs is already in the upstream image: the Overpass
# binaries, nginx, supervisor, curl and osmium-tool. What we add is the tag
# filter the extract is cut down with, the three commands that apply it, and
# the entrypoint hooks (CORS, a socket for supervisorctl, and the access log).
#
# The database is a directory of files under /db, read by the same process that
# answers queries. There is no separate database server, which is why this
# compose project has one service in it.
ARG OVERPASS_VERSION=v0.7.62.11
FROM wiktorn/overpass-api:${OVERPASS_VERSION}

# The one thing the image does not already have. Requests are logged to the /db
# volume rather than to stdout (see initdb.d/15-access-log.sh), and a log that
# outlives the container is a log that needs rotating
RUN apt-get update \
    && apt-get install -y --no-install-recommends logrotate \
    && rm -rf /var/lib/apt/lists/*

# Generated from CATEGORY_CONFIG by `npm run overpass:filters`. Baked in rather
# than mounted, so an image always says which categories it was built for
COPY osmium-filter.txt /opt/wayside/osmium-filter.txt

# The region lists, for the servers that build their extract a country at a
# time rather than a continent at once. europe-regions.txt is the countries
# europe-latest.osm.pbf is made of; world-regions.txt is those plus every other
# region a city in the app sits in. Pick one with WAYSIDE_REGION_LIST
COPY europe-regions.txt world-regions.txt /opt/wayside/

COPY bin/filter-osm-extract bin/join-buildings bin/build-region-extract bin/update-poi-db \
    bin/rotate-access-log /usr/local/bin/
COPY initdb.d/ /docker-entrypoint-initdb.d/

RUN chmod a+rx /usr/local/bin/filter-osm-extract /usr/local/bin/join-buildings \
    /usr/local/bin/build-region-extract /usr/local/bin/update-poi-db \
    /usr/local/bin/rotate-access-log \
    /docker-entrypoint-initdb.d/*.sh
