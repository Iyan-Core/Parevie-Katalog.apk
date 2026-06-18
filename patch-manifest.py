import os
import re

manifest_path = "android/app/src/main/AndroidManifest.xml"

if not os.path.exists(manifest_path):
    print(f"AndroidManifest tidak ditemukan di {manifest_path}, skip.")
    raise SystemExit(0)

with open(manifest_path, "r") as f:
    content = f.read()

permissions = [
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.INTERNET",
    "android.permission.CAMERA",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
]

lines_to_add = []
for perm in permissions:
    if perm not in content:
        lines_to_add.append('    <uses-permission android:name="%s"/>' % perm)

if lines_to_add:
    insertion = "\n".join(lines_to_add) + "\n"
    content = re.sub(r"(<application)", insertion + r"\1", content, count=1)
    print("Izin ditambahkan:")
    for line in lines_to_add:
        print(" ", line.strip())
else:
    print("Semua izin sudah ada, tidak ada perubahan.")

with open(manifest_path, "w") as f:
    f.write(content)

print("\n--- Isi AndroidManifest.xml setelah patch ---")
print(content)
