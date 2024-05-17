# Stage 1: Build busybox with lsof
FROM debian:bullseye as lsofbuilder

# Install dependencies for building busybox
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    libncurses5-dev \
    bison \
    flex

# Set environment variables
ENV BUSYBOX_VERSION=1.35.0

# Download, extract, configure, and compile BusyBox
RUN wget https://busybox.net/downloads/busybox-${BUSYBOX_VERSION}.tar.bz2 && \
    tar -xvjf busybox-${BUSYBOX_VERSION}.tar.bz2 && \
    cd busybox-${BUSYBOX_VERSION} && \
    make defconfig && \
    sed -i 's/CONFIG_DESKTOP=n/CONFIG_DESKTOP=y/' .config && \
    sed -i 's/# CONFIG_LSOF is not set/CONFIG_LSOF=y/' .config && \
    sed -i '/CONFIG_.*=y/!s/# \(CONFIG_.*\) is not set/\1=n/' .config && \
    sed -i 's/CONFIG_BUILD_LIBBUSYBOX=y/CONFIG_BUILD_LIBBUSYBOX=n/' .config && \
    make oldconfig && \
    make -j$(nproc) && \
    make install

# Stage 2: Build spotifyd
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
COPY --from=lsofbuilder /busybox-1.35.0/_install/bin/busybox /bin/lsof
COPY docker/start-spotifyd /start-spotifyd

# Set working directory
WORKDIR /usr/local/bin

# Run spotifyd
CMD ["/bin/sh", "/start-spotifyd"]
#CMD ["sleep", "3000" ]

USER spotify
