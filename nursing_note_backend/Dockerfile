# =====================================================
# NestJS 백엔드 - 멀티스테이지 Docker 빌드
# Stage 1: 빌드 (TypeScript → JavaScript 컴파일)
# Stage 2: 실행 (컴파일된 JS만 포함하여 이미지 경량화)
# =====================================================

# --- Stage 1: 빌드 ---
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 파일만 먼저 복사 → 캐시 레이어 활용
# (소스 코드가 바뀌어도 의존성이 같으면 재설치 생략)
COPY package.json package-lock.json ./

RUN npm ci

# 소스 코드 복사 후 빌드
COPY . .

RUN npm run build

# --- Stage 2: 실행 ---
FROM node:20-alpine AS runner

WORKDIR /app

# 프로덕션 의존성만 설치 (devDependencies 제외)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 빌드된 결과물만 복사 (소스 코드 제외 → 이미지 경량화)
COPY --from=builder /app/dist ./dist

EXPOSE 3001

# node로 직접 실행 (nest start는 dev용이므로 프로덕션에서는 node 사용)
CMD ["node", "dist/main.js"]
