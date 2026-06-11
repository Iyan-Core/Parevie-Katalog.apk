#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# patch-android.sh
# Jalankan SETELAH "npx cap add android" dan "npx cap copy android"
# Script ini:
#   1. Copy network_security_config.xml ke res/xml/
#   2. Patch AndroidManifest.xml agar mereferensikan network config
#   3. Pastikan usesCleartextTraffic = false (HTTPS only, lebih aman)
# ─────────────────────────────────────────────────────────────────

set -e

MANIFEST="android/app/src/main/AndroidManifest.xml"
XML_DIR="android/app/src/main/res/xml"
NET_CONFIG="android-patch/network_security_config.xml"

echo "📋 Patching Android untuk Firebase Storage support..."

# 1. Buat folder res/xml jika belum ada
mkdir -p "$XML_DIR"

# 2. Copy network_security_config.xml
cp "$NET_CONFIG" "$XML_DIR/network_security_config.xml"
echo "✅ network_security_config.xml disalin ke $XML_DIR"

# 3. Patch AndroidManifest.xml
#    Tambahkan networkSecurityConfig ke tag <application>
if grep -q "networkSecurityConfig" "$MANIFEST"; then
    echo "ℹ️  networkSecurityConfig sudah ada di AndroidManifest, skip."
else
    # Tambahkan setelah android:label=... di tag <application>
    sed -i 's|\(android:label="[^"]*"\)|\1\n        android:networkSecurityConfig="@xml/network_security_config"|' "$MANIFEST"
    echo "✅ AndroidManifest.xml dipatch dengan networkSecurityConfig"
fi

# 4. Pastikan android:usesCleartextTraffic tidak true
if grep -q 'usesCleartextTraffic="true"' "$MANIFEST"; then
    sed -i 's/android:usesCleartextTraffic="true"/android:usesCleartextTraffic="false"/' "$MANIFEST"
    echo "✅ usesCleartextTraffic diubah ke false"
fi

echo ""
echo "🎉 Patch selesai! Silakan build APK."
