FROM alpine:latest AS builder
ARG CARGO_NET_GIT_FETCH_WITH_CLI=true

# Install additional build dependencies
RUN apk -U --no-cache add \
    git \
    build-base \
    avahi-dev \
    autoconf \
    automake \
    libtool \
    libdaemon-dev \
    alsa-lib-dev \
    libressl-dev \
    libconfig-dev \
    libstdc++ \
    gcc \
    rust \
    cargo \
    dbus-dev

# Set working directory
WORKDIR /app

# Clone the Spotifyd source code from GitHub
RUN git clone https://github.com/Spotifyd/spotifyd.git .

# Set client ID
ARG SPOTIFY_CLIENT_ID
RUN echo "Using Spotify client ID $SPOTIFY_CLIENT_ID"
RUN sed -i "s/const CLIENT_ID: .*\$/const CLIENT_ID: \&str = \"$SPOTIFY_CLIENT_ID\";/" src/dbus_mpris.rs

# Compile the source code
RUN cargo build -j 4 --release --features dbus_mpris

# Create a new image
FROM alpine:latest

# Install dependencies
RUN apk -U --no-cache add \
    libgcc \
    alsa-lib \
    dbus-libs \
    && addgroup -S spotify \
    && adduser --system --ingroup spotify --no-create-home --disabled-password --uid 2002 spotify \
    && mkdir /cache \
    && chown spotify /cache

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/spotifyd /usr/local/bin/spotifyd

# Set working directory
WORKDIR /usr/local/bin

# Run spotifyd
CMD ["/usr/local/bin/spotifyd", "--no-daemon"]

USER spotify
