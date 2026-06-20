#!/bin/bash
echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"
if [[ "$VERCEL_GIT_COMMIT_REF" == "dev" || \
      "$VERCEL_GIT_COMMIT_REF" == "main" || \
      "$VERCEL_GIT_COMMIT_REF" == "feature/prisma" ]]; then
  echo "✅ Build can proceed"
  exit 1   # Continue build
else
  echo "🛑 Build cancelled"
  exit 0   # Skip build
fi
