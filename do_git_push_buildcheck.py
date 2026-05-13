import subprocess, os

repo = os.path.expanduser("~/ccb-app")
lock = os.path.join(repo, ".git", "index.lock")
if os.path.exists(lock):
    os.remove(lock)
    print("Lock removed")

files = [
    "components/pwa/BuildCheck.tsx",
    "app/layout.tsx",
]

r0 = subprocess.run(["git", "add"] + files, cwd=repo, capture_output=True, text=True, encoding="utf-8")
print("ADD:", r0.stdout or "ok", r0.stderr[:300] if r0.stderr else "")

r1 = subprocess.run(
    ["git", "commit", "-m", "fix: BuildCheck - force hard reload + clear SW cache on new Vercel deployment"],
    cwd=repo, capture_output=True, text=True, encoding="utf-8"
)
print("COMMIT:", r1.stdout.strip(), r1.stderr[:200] if r1.stderr else "")

if r1.returncode == 0:
    r2 = subprocess.run(["git", "push", "origin", "main"], cwd=repo, capture_output=True, text=True, encoding="utf-8")
    print("PUSH:", r2.stderr.strip() or r2.stdout.strip())
    if r2.returncode == 0:
        print("\nDeploy declenche sur Vercel !")
    else:
        print("PUSH FAILED:", r2.stderr)
else:
    print("Rien a commiter ou erreur.")
