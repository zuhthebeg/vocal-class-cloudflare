#!/bin/bash
# Quick deployment script for Cloudflare Pages

echo "🚀 Vocal Class - Cloudflare 배포 스크립트"
echo "=========================================="
echo ""

# 1. Wrangler 설치 확인
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler가 설치되지 않았습니다."
    echo "📦 설치 중..."
    npm install -g wrangler
fi

echo "✅ Wrangler 설치 완료"
echo ""

# 2. 로그인 확인
echo "🔐 Cloudflare 로그인 확인 중..."
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  로그인이 필요합니다."
    wrangler login
fi

echo "✅ 로그인 완료"
echo ""

# 3. D1 데이터베이스 생성
echo "🗄️  D1 데이터베이스 생성 중..."
read -p "데이터베이스를 생성하시겠습니까? (y/n): " create_db

if [ "$create_db" = "y" ]; then
    wrangler d1 create vocal-class-db
    echo ""
    echo "⚠️  위 출력에서 database_id를 복사하여 wrangler.toml에 붙여넣으세요!"
    echo ""
    read -p "wrangler.toml을 수정했으면 엔터를 눌러주세요..."
    
    echo "📝 데이터베이스 스키마 초기화 중..."
    wrangler d1 execute vocal-class-db --file=./schema.sql
    echo "✅ 데이터베이스 초기화 완료"
fi

echo ""

# 4. R2 버킷 생성
echo "📦 R2 버킷 생성 중..."
read -p "R2 버킷을 생성하시겠습니까? (y/n): " create_r2

if [ "$create_r2" = "y" ]; then
    wrangler r2 bucket create vocal-class-storage
    echo "✅ R2 버킷 생성 완료"
fi

echo ""

# 5. Pages 프로젝트 배포
echo "🌐 Pages 프로젝트 배포 중..."
read -p "배포 방법을 선택하세요 (1: Git 연결, 2: Direct Upload): " deploy_method

if [ "$deploy_method" = "1" ]; then
    echo ""
    echo "📝 Git 저장소 설정 가이드:"
    echo "1. GitHub에서 새 저장소 생성"
    echo "2. 아래 명령어 실행:"
    echo ""
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/vocal-class.git"
    echo "   git push -u origin main"
    echo ""
    echo "3. Cloudflare 대시보드에서 Pages 프로젝트 생성 및 저장소 연결"
    echo "   https://dash.cloudflare.com/"
    
elif [ "$deploy_method" = "2" ]; then
    echo "📤 Direct Upload로 배포 중..."
    
    # Pages 프로젝트가 없으면 생성
    if ! wrangler pages project list | grep -q "vocal-class"; then
        wrangler pages project create vocal-class
    fi
    
    wrangler pages deploy . --project-name=vocal-class
    echo "✅ 배포 완료!"
    echo ""
    echo "🎉 서비스가 https://vocal-class.pages.dev 에서 실행 중입니다!"
fi

echo ""
echo "=========================================="
echo "✨ 배포 프로세스 완료!"
echo ""
echo "📌 다음 단계:"
echo "1. Cloudflare 대시보드에서 커스텀 도메인 연결 (cocy.io)"
echo "2. 기존 JS 파일들을 API 호출로 수정"
echo "3. 로컬 테스트: wrangler pages dev ."
echo ""
echo "📚 자세한 가이드: DEPLOYMENT.md 파일 참조"
echo "=========================================="
