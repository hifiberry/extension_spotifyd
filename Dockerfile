# Use a base image with Rust toolchain
FROM rust:latest AS builder

# Install additional build dependencies
RUN apt-get update && \
    apt-get install -y git libasound2-dev libdbus-1-dev

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
FROM debian:stable-slim

# Install dependencies
RUN apt-get update && \
    apt-get install -yqq --no-install-recommends libasound2 dbus curl alsa-tools alsa-utils && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r spotify && \
    useradd --no-log-init -r -g spotify -u 2002 spotify && \
    mkdir /cache && \
    chown spotify /cache

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/spotifyd /usr/local/bin/spotifyd

# Set working directory
WORKDIR /usr/local/bin

# Run spotifyd
CMD ["dbus-run-session", "/usr/local/bin/spotifyd", "--no-daemon"]

USER spotify
