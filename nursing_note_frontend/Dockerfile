# =====================================================
# 프론트엔드 - 멀티스테이지 Docker 빌드
# Stage 1: Vite로 React 앱 빌드 (정적 파일 생성)
# Stage 2: Nginx로 빌드된 정적 파일 서빙
# =====================================================

# --- Stage 1: 빌드 ---
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 파일만 먼저 복사 → Docker 캐시 레이어 활용
COPY package.json package-lock.json ./

RUN npm ci

# 소스 코드 복사 후 Vite 빌드
COPY . .

RUN npm run build

# --- Stage 2: Nginx로 서빙 ---
FROM nginx:1.27-alpine AS runner

# 기본 Nginx 설정 제거 후, 커스텀 설정 복사
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 빌드된 정적 파일을 Nginx 서빙 디렉토리로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
