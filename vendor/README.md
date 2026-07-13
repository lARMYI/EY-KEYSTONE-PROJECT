# vendor/

Third-party code vendored into the repo so the site is fully self-contained
and first-party (no external requests, no CDN dependency).

## three.min.js — three.js r128

- **Version:** r128 (npm `three@0.128.0`, `build/three.min.js`)
- **Licence:** MIT — © 2010–2021 three.js authors (the licence header is
  preserved at the top of the file; SPDX-License-Identifier: MIT)
- **Used by:** `js/keystone3d.js` (the morphing 3D keystone spine on
  `index.html`). If the file is missing or fails, the page degrades
  silently to a drawn SVG arch.
- **Integrity (SHA-512, base64):**
  `sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==`

This is byte-for-byte the same file the cdnjs r128 SRI hash pins, verified
by re-hashing on vendoring.

### To update / re-verify

```bash
# fetch the same versioned build and confirm the hash before replacing
curl -fsSL https://raw.githubusercontent.com/mrdoob/three.js/r128/build/three.min.js -o vendor/three.min.js
echo "sha512-$(openssl dgst -sha512 -binary vendor/three.min.js | openssl base64 -A)"
# must print the integrity value above
```
