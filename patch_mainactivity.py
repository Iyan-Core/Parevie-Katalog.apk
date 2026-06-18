import glob

candidates = glob.glob("android/**/MainActivity.java", recursive=True) + \
             glob.glob("android/**/MainActivity.kt", recursive=True)

if not candidates:
    print("MainActivity tidak ditemukan, skip.")
    raise SystemExit(0)

path = candidates[0]
print("File: %s" % path)

with open(path, "r") as f:
    content = f.read()

if "setGeolocationEnabled" in content:
    print("Geolocation sudah aktif, tidak ada perubahan.")
elif path.endswith(".java"):
    injection = (
        "super.onCreate(savedInstanceState);\n"
        "        com.getcapacitor.Bridge bridge = getBridge();\n"
        "        if (bridge != null && bridge.getWebView() != null) {\n"
        "            bridge.getWebView().getSettings().setGeolocationEnabled(true);\n"
        "        }"
    )
    content = content.replace("super.onCreate(savedInstanceState);", injection, 1)
    with open(path, "w") as f:
        f.write(content)
    print("Geolocation diaktifkan (Java).")
elif path.endswith(".kt"):
    injection = (
        "super.onCreate(savedInstanceState)\n"
        "        bridge?.webView?.settings?.setGeolocationEnabled(true)"
    )
    content = content.replace("super.onCreate(savedInstanceState)", injection, 1)
    with open(path, "w") as f:
        f.write(content)
    print("Geolocation diaktifkan (Kotlin).")

with open(path, "r") as f:
    print("\n--- Isi file setelah patch ---")
    print(f.read())
