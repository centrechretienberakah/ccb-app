import subprocess, os

repo = os.path.expanduser("~/ccb-app")
lock = os.path.join(repo, ".git", "index.lock")
if os.path.exists(lock):
    os.remove(lock)
    print("Lock removed")

files = [
    "public/sw.js",
    "components/pwa/RegisterSW.tsx",
    "components/pwa/BuildCheck.tsx",
    "app/layout.tsx",
    "do_git_push_sw_final.py",
]

r0 = subprocess.run(["git", "add"] + files, cwd=repo,
                    capture_output=True, text=True, encoding="utf-8")
print("ADD:", r0.stdout or "ok", r0.stderr[:200] if r0.stderr else "")

r1 = subprocess.run(
    ["git", "commit", "-m",
     "fix: SW v4 - never cache HTML pages + BuildCheck buildId force-reload"],
    cwd=repo, capture_output=True, text=True, encoding="utf-8"
)
print("COMMIT:", r1.stdout.strip(), r1.stderr[:200] if r1.stderr else "")

if r1.returncode == 0:
    r2 = subprocess.run(["git", "push", "origin", "main"], cwd=repo,
                        capture_output=True, text=True, encoding="utf-8")
    print("PUSH:", r2.stderr.strip() or r2.stdout.strip())
    if r2.returncode == 0:
        print("\nVercel deploy declenche - fix definitif actif !")
    else:
        print("PUSH FAILED:", r2.stderr)
else:
    print("Rien a commiter ou erreur.")
