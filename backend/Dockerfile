# ============================================================
# Dockerfile - Backend Spring Boot
# ============================================================

# -------- Build stage --------
FROM maven:3.9.9-eclipse-temurin-17 AS builder

WORKDIR /app

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src

RUN mvn -B clean package -DskipTests 2>&1 || (echo "=== BUILD FAILED ===" && mvn -B clean package -DskipTests 2>&1 | grep -A 5 "ERROR" && exit 1)


# -------- Runtime stage --------
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN addgroup -S luxshop && adduser -S luxshop -G luxshop

RUN mkdir -p /app/uploads && chown luxshop:luxshop /app/uploads

COPY --from=builder /app/target/*.jar app.jar

USER luxshop

EXPOSE 8080

ENTRYPOINT ["java","-jar","app.jar"]
