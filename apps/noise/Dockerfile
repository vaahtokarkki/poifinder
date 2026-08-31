# The noise tile builder.
#
# Three tools and no framework: osmium cuts the extract and writes GeoJSON,
# shapely does the buffering, tippecanoe writes the tiles. Everything else is
# the shell script that runs them in order.
#
# Deliberately not NoiseModelling. That is the real thing — CNOSSOS-EU, the
# EU's own method — and it wants a JVM, a terrain model and GeoClimate to
# prepare its input. For three bands rendered at z12 the difference does not
# reach the screen, and this image is 400 MB against several gigabytes. See
# "Accuracy, and what would improve it" in README.md for when that trade stops
# being the right one.

# ---- tippecanoe, built once and copied out --------------------------------
# Not in Debian, and the upstream repository moved: mapbox/tippecanoe is
# archived, felt/tippecanoe is the maintained fork
FROM debian:bookworm-slim AS tippecanoe

ARG TIPPECANOE_VERSION=2.78.0

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl libsqlite3-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fSL "https://github.com/felt/tippecanoe/archive/refs/tags/${TIPPECANOE_VERSION}.tar.gz" \
      | tar xz -C /tmp \
    && make -C "/tmp/tippecanoe-${TIPPECANOE_VERSION}" -j"$(nproc)" \
    && make -C "/tmp/tippecanoe-${TIPPECANOE_VERSION}" install \
    && rm -rf "/tmp/tippecanoe-${TIPPECANOE_VERSION}"

# ---- the image the build actually runs in ---------------------------------
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      osmium-tool \
      python3 \
      python3-shapely \
    && rm -rf /var/lib/apt/lists/*

COPY --from=tippecanoe /usr/local/bin/tippecanoe /usr/local/bin/tippecanoe
COPY --from=tippecanoe /usr/local/bin/tile-join /usr/local/bin/tile-join

COPY bin/ /usr/local/bin/
RUN chmod +x /usr/local/bin/build-noise-tiles /usr/local/bin/noise-bands

# Generated from src/seo/cities.ts by `npm run noise:cities`. Baked in rather
# than mounted, so that an image is a complete answer to "which cities does
# this build" without a file next to it
COPY cities.json /opt/wayside/cities.json

ENV NOISE_CITIES_FILE=/opt/wayside/cities.json \
    NOISE_TILE_DIR=/tiles \
    NOISE_CACHE_DIR=/cache \
    NOISE_MIN_ZOOM=10 \
    NOISE_MAX_ZOOM=12

VOLUME ["/tiles", "/cache"]

# Nothing on start. This is a batch job that is run, not a service that runs:
# `docker compose run --rm builder build-noise-tiles`, or the same on a
# schedule. A container that began a 50 GB download because it was restarted
# is the failure this avoids — it is the one apps/overpass had to be split in
# two to fix, and there is no reason to repeat it here
ENTRYPOINT []
CMD ["sleep", "infinity"]
