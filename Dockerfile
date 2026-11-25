# ==============================================================================
# Multi-stage hardened non-root Dockerfile for Railway (Node 22 + Caddy 2)
# Follows Railway's official React/Vite guide: https://railway.com/guides/react
# ==============================================================================

FROM node:26-alpine AS build

ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

WORKDIR /app

# Declare Vite build-time environment variables (Railway injects service vars as ARGs)
# IMPORTANT: VITE_SITE_URL is REQUIRED (no default fallback) — set it in Railway Service Variables!
ARG VITE_APP_NAME="کالری‌شمار روزمره"
ARG VITE_SITE_URL=""
ARG VITE_DEFAULT_DAILY_KCAL=2000
ARG VITE_DEFAULT_WATER_GOAL_GLASSES=8
ARG VITE_ENABLE_PWA=true
ARG VITE_REPO_URL="https://github.com/soroushse7o/persian-calorie-tracker"

ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_DEFAULT_DAILY_KCAL=$VITE_DEFAULT_DAILY_KCAL
ENV VITE_DEFAULT_WATER_GOAL_GLASSES=$VITE_DEFAULT_WATER_GOAL_GLASSES
ENV VITE_ENABLE_PWA=$VITE_ENABLE_PWA
ENV VITE_REPO_URL=$VITE_REPO_URL

COPY package*.json ./
RUN npm ci

COPY . ./
RUN test -n "$VITE_SITE_URL" || (echo "ERROR: VITE_SITE_URL build-arg/variable is required!" >&2 && exit 1)
RUN npm run build

# ==============================================================================
# Runtime Stage: Non-root lightweight Caddy 2 static SPA server
# ==============================================================================
FROM caddy:2-alpine AS runner

WORKDIR /app

# Create dedicated non-root system user and prepare writable Caddy data/config dirs
RUN addgroup -S -g 1001 appgroup \
  && adduser -S -u 1001 -G appgroup appuser \
  && mkdir -p /app/dist /data /config \
  && chown -R appuser:appgroup /app /data /config

COPY --chown=appuser:appgroup Caddyfile /app/Caddyfile
RUN caddy fmt /app/Caddyfile --overwrite

COPY --from=build --chown=appuser:appgroup /app/dist /app/dist

USER appuser

ENV XDG_DATA_HOME=/data
ENV XDG_CONFIG_HOME=/config

EXPOSE 3000

CMD ["caddy", "run", "--config", "/app/Caddyfile", "--adapter", "caddyfile"]
