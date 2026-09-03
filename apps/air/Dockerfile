# The air quality tile builder.
#
# Four Python packages and tippecanoe, and no framework. The whole pipeline is
# a fetch, some numpy arithmetic, a contour and a tiler; see build-air-tiles
# for the order and README.md for why each step is the shape it is.
#
# Deliberately not GDAL, not rasterio, not scipy, not matplotlib. Every one of
# them would do a piece of this and each pulls in several hundred megabytes for
# it. What is actually needed is: an array (numpy), a contourer (contourpy,
# which is the library matplotlib itself contours with, without the figure), a
# geometry engine (shapely) and a tiler. The image is ~250 MB against the ~1.5
# GB a geospatial stack would cost, and nothing here is a compromise for it.

# ---- tippecanoe, built once and copied out --------------------------------
# Not in Debian, and the upstream repository moved: mapbox/tippecanoe is
# archived, felt/tippecanoe is the maintained fork. Same version apps/noise
# pins, because the two write tiles for the same client
FROM debian:bookworm-slim AS tippecanoe

ARG TIPPECANOE_VERSION=2.78.0

# How many compiler processes. Defaults to every core, which is what a build
# machine wants; set it lower to build on a box that is already busy, where -j4
# of g++ is a few hundred megabytes each and the thing that gets killed is
# whichever neighbour was using the most memory
ARG JOBS=0

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl libsqlite3-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fSL "https://github.com/felt/tippecanoe/archive/refs/tags/${TIPPECANOE_VERSION}.tar.gz" \
      | tar xz -C /tmp \
    && make -C "/tmp/tippecanoe-${TIPPECANOE_VERSION}" -j"$([ "$JOBS" -gt 0 ] && echo "$JOBS" || nproc)" \
    && make -C "/tmp/tippecanoe-${TIPPECANOE_VERSION}" install \
    && rm -rf "/tmp/tippecanoe-${TIPPECANOE_VERSION}"

# ---- the image the build actually runs in ---------------------------------
FROM python:3.12-slim-bookworm

# Pinned rather than floating, and not out of caution about breakage. This
# writes tiles a browser renders, and a silent change in how contourpy orders
# the rings of a filled contour would change which polygons come out with
# holes in them — a difference nothing in the pipeline would fail on and
# somebody would eventually notice as a city drawn inside out
RUN pip install --no-cache-dir \
      numpy==2.3.3 \
      shapely==2.1.2 \
      contourpy==1.3.3

COPY --from=tippecanoe /usr/local/bin/tippecanoe /usr/local/bin/tippecanoe
COPY --from=tippecanoe /usr/local/bin/tile-join /usr/local/bin/tile-join
# Not used by the pipeline, and here anyway. It is built by the stage above
# either way, and it is the only way to answer "what is actually in this tile"
# without a browser — which is the first question whenever the layer looks
# wrong and the second whenever it looks right
COPY --from=tippecanoe /usr/local/bin/tippecanoe-decode /usr/local/bin/tippecanoe-decode

COPY bin/ /usr/local/bin/
RUN chmod +x /usr/local/bin/build-air-tiles /usr/local/bin/air-latest \
      /usr/local/bin/air-field

# The city boundaries the tiles are clipped to — every European capital plus
# every European city of a million or more residents, fetched once by
# bin/fetch-boundaries and cached in the file. Baked in rather than mounted,
# for the reason apps/noise bakes cities.json: an image should be a complete
# answer to "what does this build" without a file next to it. They are
# OpenStreetMap relations via Nominatim, so they are ODbL — which is most of
# why the tiles this produces are ODbL too, and the README says so
COPY boundaries.geojson /opt/wayside/boundaries.geojson

ENV AIR_BOUNDARY_FILE=/opt/wayside/boundaries.geojson \
    AIR_CITIES= \
    AIR_BUFFER_KM=10 \
    AIR_POINT_BUFFER_KM=20 \
    AIR_TILE_DIR=/tiles \
    AIR_WORK_DIR=/work \
    AIR_MIN_ZOOM=2 \
    AIR_MAX_ZOOM=8 \
    AIR_GRID_DEGREES=0.02 \
    AIR_INFLUENCE_KM=150 \
    AIR_MASK_KM=75 \
    AIR_MAX_AGE_HOURS=6

VOLUME ["/tiles"]

# Nothing on start. This is a batch job that is run, not a service that runs:
# `docker compose run --rm builder build-air-tiles`, or the same on a schedule.
# Unlike the noise builder there is no gigabyte download to be afraid of here,
# but the shape is worth keeping — a container that does its work on restart is
# a container that does its work at the worst possible moment
ENTRYPOINT []
CMD ["sleep", "infinity"]
