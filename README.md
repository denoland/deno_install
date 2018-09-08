# Deno Binary Installer

| **Linux** | **Windows** |
|:---------------:|:-----------:|
| [![Build Status](https://travis-ci.com/denoland/deno_install.svg?branch=master)](https://travis-ci.com/denoland/deno_install) | [![Build status](https://ci.appveyor.com/api/projects/status/gtekeaf7r60xa896?svg=true)](https://ci.appveyor.com/project/deno/deno-install) |

Downloads the latest Deno binary into `$HOME/.deno/bin`.

**Install with Python:**

```
curl -sSf https://raw.githubusercontent.com/denoland/deno_install/master/install.py | python
```

**Install with PowerShell:**

```powershell
iex (iwr https://raw.githubusercontent.com/denoland/deno_install/master/install.ps1)
```

_Note: Depending on your security settings, you may have to run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` first to allow downloaded scripts to be executed._
