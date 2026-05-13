import subprocess, os, sys

repo = r"C:\Users\Révérend\ccb-app"
os.chdir(repo)

# Remove lock if exists
lock = os.path.join(repo, ".git", "index.lock")
if os.path.exists(lock):
    os.remove(lock)

cmds = [
    ["git", "add", "-A"],
    ["git", "commit", "-m", "feat-activate-all-10-modules-classes-live-jesus-daily-annonces-galerie-groupes-bibliotheque-temoignages-dons-nous-suivre"],
    ["git", "push", "origin", "main"],
]
for cmd in cmds:
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=repo)
    print("CMD:", " ".join(cmd))
    print("OUT:", r.stdout.strip())
    if r.stderr.strip(): print("ERR:", r.stderr.strip())
    if r.returncode != 0 and "nothing to commit" not in r.stdout and "nothing to commit" not in r.stderr:
        print("FAILED, stopping")
        sys.exit(1)
print("ALL DONE")
