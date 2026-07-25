# ---------- Étape 1 : build de l'app Angular ----------
FROM node:20-alpine AS build
WORKDIR /app

# Installe les dépendances à partir du lockfile (reproductible)
COPY package.json package-lock.json ./
RUN npm ci

# Copie le code et build de production (sortie dans ./www)
COPY . .
RUN npm run build

# ---------- Étape 2 : image finale servie par nginx ----------
FROM nginx:1.27-alpine AS runtime

# Config nginx (fallback SPA + cache des assets)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Fichiers statiques compilés
COPY --from=build /app/www /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
