FROM node:20.17.0

#RUN mkdir /fw_api/
#WORKDIR /fw_api/
WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# TypeScript 설정 및 소스 파일 복사
COPY tsconfig.json ./
COPY . .

# ts-node 전역 설치
RUN npm install -g ts-node

# 환경 변수 설정
ENV NODE_ENV=production

# 포트 설정 (필요한 포트로 수정하세요)
EXPOSE 7878

# ts-node와 tsconfig-paths로 TypeScript 실행
CMD ["ts-node", "-r", "tsconfig-paths/register", "index.ts"]

