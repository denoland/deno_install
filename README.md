# Deno Binary Installer

| **Linux** | **Windows** |
|:---------------:|:-----------:|
| [![Build Status](https://travis-ci.com/denoland/deno_install.svg?branch=master)](https://travis-ci.com/denoland/deno_install) | [![Build status](https://ci.appveyor.com/api/projects/status/gtekeaf7r60xa896?branch=master&svg=true)](https://ci.appveyor.com/project/deno/deno-install) |

Downloads the latest Deno binary into `$HOME/.deno/bin`.

**Install with Shell:**

```sh
curl -L https://deno.land/x/install/install.sh | sh
```

**Install with Python:**

```sh
curl -L https://deno.land/x/install/install.py | python
```

**Install with PowerShell:**

```powershell
iex (iwr https://deno.land/x/install/install.ps1)
```

_Note: Depending on your security settings, you may have to run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` first to allow downloaded scripts to be executed._

**Update with deno:**

```
deno --allow-write --allow-net --allow-env --allow-run https://deno.land/x/install/install.ts
```

_Note: Installs the latest `deno` version by default._

## Install other versions

If you need to install specific version of deno, use the following commands:

**Install with Shell:**

```sh
curl -L https://deno.land/x/install/install.sh | sh -s v0.2.0
```

**Install with Python:**

```sh
curl -L https://deno.land/x/install/install.py | python - v0.2.0
```

**Install with PowerShell:**

```powershell
iwr https://deno.land/x/install/install.ps1 -out install.ps1; .\install.ps1 v0.2.0
```

_Note: Depending on your security settings, you may have to run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` first to allow downloaded scripts to be executed._

**(Re)install with deno:**

```
deno --allow-all https://deno.land/x/install/install.ts v0.2.8
```
