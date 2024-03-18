FROM --platform=$BUILDPLATFORM rust:1.75.0-buster AS rust_fix

ENV USER=root
ENV V_spotifyd=v0.3.5

WORKDIR /usr/src/spotifyd
RUN apt-get -y update && \
    apt-get install --no-install-recommends -y apt-transport-https ca-certificates git && \
    git clone --depth 1 --branch=${V_spotifyd} https://github.com/Spotifyd/spotifyd.git .

# Don't do `cargo init` or --> error: `cargo init` cannot be run on existing Cargo packages
# RUN cargo init
RUN mkdir -p .cargo \
  && cargo vendor > .cargo/config

FROM rust:1.75.0-buster as build

RUN apt-get -y update && \
    apt-get install --no-install-recommends -y libasound2-dev libdbus-1-dev

COPY --from=rust_fix /usr/src/spotifyd /usr/src/spotifyd
WORKDIR /usr/src/spotifyd

RUN cargo build -j 2 --release --features dbus_mpris --offline

FROM debian:buster-slim as release

CMD ["dbus-run-session", "/usr/bin/spotifyd", "--no-daemon"]

RUN apt-get update && \
    apt-get install -yqq --no-install-recommends libasound2 dbus libssl1.1 alsa-tools alsa-utils && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r spotify && \
    useradd --no-log-init -r -g spotify -u 2002 spotify && \
    mkdir /cache && \
    chown spotify /cache

COPY --from=build /usr/src/spotifyd/target/release/spotifyd /usr/bin/

USER spotify