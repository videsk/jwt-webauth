# Changelog

The versioning is based on a semantic version (semver).

### v.3.0.6

- [FIX] Stable version

### v3.0.0 [Break change]

**CAUTION**: this version will crash your current project, check [README](https://github.com/videsk/front-auth-handler#readme) to do changes correctly.

This version is focused on security tokens handle and integration with request interceptors to force renew the access token if JWT could be invalid by others factors like blacklist. 

- [NEW] Completely rebased
- [NEW] Events expired, renewed, empty and error
- [NEW] Force renew
- [NEW] Mocha test
- [NEW] Coverage test
- [NEW] Examples

### v2.4.0

- [FIX] Completely refactored (5Kb less)
- [NEW] jsDocs added to source code
- [NEW] Dynamic Body parser added
- [NEW] Max attempts added
- [TODO] Add max attempts to internet issues (v3.0.0)
- [TODO] Add proxy handle request failed by 401 (v3.0.0)
- [TODO] Update README.md (v3.0.0)
- [TODO] Add examples how to use (v3.0.0)
- [TODO] Add tests (v3.0.0)

### v2.3.0

- [FIX] Fixed infinite interval when error code is different of custom code

### v2.0.7

- [FIX] Added changelog to readme

### v2.0.6

- [FIX] Auto detect storage or manually for set boolean in remember.
- [NEW] Added changelog

### v2.0.5

- [FIX] Corrected some words in readme

### v2.0.4

- [FIX] Corrected some words in readme

### v2.0.0 - v2.0.3

- [NEW] Added HTTP tokens validation and implementation of refresh token for auto-generate a new access token via HTTP.


**Previous versions are deprecated, we recommend not use.**
