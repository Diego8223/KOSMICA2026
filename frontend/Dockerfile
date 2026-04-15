# ============================================================
# Dockerfile - Frontend React
# ============================================================

# ---------- Build ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

# limpiar cache
RUN npm cache clean --force

# instalar dependencias correctamente
RUN npm install --legacy-peer-deps

# copiar proyecto
COPY . .

# instalar dependencia que falta
RUN npm install ajv@8 ajv-keywords@5 --save

# build
RUN npm run build


# ---------- Nginx ----------
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf   # ← AGREGA ESTA

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]