#!/bin/bash
echo "Post ID 마이그레이션 스크립트 실행..."
node scripts/migrate-post-ids.js
echo ""
echo "실행이 완료되었습니다."
read -p "계속하려면 엔터 키를 누르세요..." 