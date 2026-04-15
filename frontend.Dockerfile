# ============================================================
# Dockerfile - Frontend React  (CORREGIDO)
# ✅ FIX: agrega COPY nginx.conf para que el proxy /api/ funcione
# ============================================================

# ---------- Build ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm cache clean --force

RUN npm install --legacy-peer-deps

COPY . .

RUN npm install ajv@8 ajv-keywords@5 --save

# Recibe las variables de entorno en build time
ARG REACT_APP_API_URL
ARG REACT_APP_ADMIN_PASSWORD
ARG REACT_APP_VAPID_PUBLIC_KEY
ARG REACT_APP_MP_PUBLIC_KEY
ARG REACT_APP_ANTHROPIC_KEY

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ADMIN_PASSWORD=$REACT_APP_ADMIN_PASSWORD
ENV REACT_APP_VAPID_PUBLIC_KEY=$REACT_APP_VAPID_PUBLIC_KEY
ENV REACT_APP_MP_PUBLIC_KEY=$REACT_APP_MP_PUBLIC_KEY
ENV REACT_APP_ANTHROPIC_KEY=$REACT_APP_ANTHROPIC_KEY

RUN npm run build


# ---------- Nginx ----------
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# ✅ FIX: copia el nginx.conf para activar el proxy /api/ → backend:8080
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
