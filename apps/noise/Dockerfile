# The noise tile builder.
#
# Four tools and no model of our own: osmium cuts the extract, NoiseModelling
# turns it into noise levels, tippecanoe writes the tiles, and a shell script
# runs them in order. Nothing in this repository computes an acoustic quantity
# any more, which is the point of it.
#
# NoiseModelling is CNOSSOS-EU, the EU's own method under Directive 2015/996,
# and the same method the published maps in bin/validate-bands are made with.
# There used to be a hand written model here, on the argument that for three
# bands at z12 the difference did not reach the screen. Measured against
# Berlin's END facade levels, it did: 41.3% balanced accuracy against the 57.2%
# of the cruder model it had replaced. See "Accuracy" in README.md.
#
# The upstream image is GPL-3.0 and is used as it ships, unmodified. Its source
# is at github.com/Universite-Gustave-Eiffel/NoiseModelling. The shell script
# and the Groovy driver in this directory are ours and are MIT, as the rest of
# the repository is.

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
#
# Pinned to a digest, not to `main`. Upstream publishes no released tag — the
# only moving name is `main` — so a floating reference would mean the model
# changing under a rebuild with nothing in this repository recording it, which
# is precisely what the validation exists to stop
FROM ghcr.io/universite-gustave-eiffel/noisemodelling:main

USER root

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
COPY groovy/ /opt/wayside/groovy/
RUN chmod +x /usr/local/bin/build-noise-tiles /usr/local/bin/validate-bands

# Generated from src/seo/cities.ts by `npm run noise:cities`. Baked in rather
# than mounted, so that an image is a complete answer to "which cities does
# this build" without a file next to it
COPY cities.json /opt/wayside/cities.json

ENV NOISE_CITIES_FILE=/opt/wayside/cities.json \
    NOISE_TILE_DIR=/tiles \
    NOISE_CACHE_DIR=/cache \
    NOISE_WORK_DIR=/work \
    NOISE_GROOVY=/opt/wayside/groovy/wayside-bands.groovy \
    NOISE_MIN_ZOOM=10 \
    NOISE_MAX_ZOOM=12

# /work is a volume now, not a directory in the container's own filesystem.
# It used to default to /tmp inside the container, which meant --keep-work kept
# the intermediates somewhere `docker run --rm` deleted a moment later
VOLUME ["/tiles", "/cache", "/work"]

# Nothing on start. This is a batch job that is run, not a service that runs.
# The upstream entrypoint starts a web server, which is the other thing this
# has to override
ENTRYPOINT []
CMD ["sleep", "infinity"]
