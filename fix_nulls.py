files = ['app/page.tsx', 'app/auth/login/page.tsx', 'app/auth/register/page.tsx']
for f in files:
    with open(f, 'rb') as fp:
        d = fp.read()
    clean = d.rstrip(b'\x00')
    if len(clean) != len(d):
        with open(f, 'wb') as fp:
            fp.write(clean)
        print(f'Fixed {f}: removed {len(d)-len(clean)} null bytes')
    else:
        print(f'OK {f} ({len(d)} bytes)')
