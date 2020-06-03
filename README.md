# deno_install

**One-line commands to install Deno on your system.**

[![Build Status](https://github.com/denoland/deno_install/workflows/ci/badge.svg?branch=master)](https://github.com/denoland/deno_install/actions)

## Install Latest Version

**With Shell:**

```sh
curl -fsSL https://deno.land/x/install/install.sh | sh
```

**With PowerShell:**

```powershell
iwr https://deno.land/x/install/install.ps1 -useb | iex
```

## Install Specific Version

**With Shell:**

```sh
curl -fsSL https://deno.land/x/install/install.sh | sh -s v1.0.0
```

**With PowerShell:**

```powershell
$v="1.0.0"; iwr https://deno.land/x/install/install.ps1 -useb | iex
```

## Install via Package Manager

**With [Scoop](https://scoop.sh):**

```powershell
scoop install deno
```

**With [Homebrew](https://formulae.brew.sh/formula/deno):**

```sh
brew install deno
```

**With [Chocolatey](https://chocolatey.org/packages/deno):**

```powershell
choco install deno
```

**With Yay (AUR) ([deno](https://aur.archlinux.org/packages/deno) and [deno-bin](https://aur.archlinux.org/packages/deno-bin)):**

```sh
# From source
yay -S deno
# Pre-compiled
yay -S deno-bin
```

## Install and Manage Multiple Versions

**With [asdf](https://asdf-vm.com) and [asdf-deno](https://github.com/asdf-community/asdf-deno):**

```sh
asdf plugin-add deno https://github.com/asdf-community/asdf-deno.git

asdf install deno 1.0.0

# Activate globally with:
asdf global deno 1.0.0

# Activate locally in the current folder with:
asdf local deno 1.0.0
```

**With [Scoop](https://github.com/lukesampson/scoop/wiki/Switching-Ruby-And-Python-Versions):**

```sh
# Install a specific version of deno:
scoop install deno@1.0.0

# Switch to v1.0.0
scoop reset deno@1.0.0

# Switch to the latest version
scoop reset deno
```

## Environment Variables

- `DENO_INSTALL` - The directory in which to install Deno. This defaults to
  `$HOME/.deno`. The executable is placed in `$DENO_INSTALL/bin`. One
  application of this is a system-wide installation:

  **With Shell (`/usr/local`):**

  ```sh
  curl -fsSL https://deno.land/x/install/install.sh | sudo DENO_INSTALL=/usr/local sh
  ```

  **With PowerShell (`C:\Program Files\deno`):**

  ```powershell
  # Run as administrator:
  $env:DENO_INSTALL = "C:\Program Files\deno"
  iwr https://deno.land/x/install/install.ps1 -useb | iex
  ```

## Compatibility

- The Shell installer can be used on Windows with [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/about), [MSYS](https://www.msys2.org) or equivalent set of tools.

## Known Issues

### unzip is required

The program [`unzip`](https://linux.die.net/man/1/unzip) is a requirement for the Shell installer.

```sh
$ curl -fsSL https://deno.land/x/install/install.sh | sh
Error: unzip is required to install Deno (see: https://github.com/denoland/deno_install#unzip-is-required).
```

**When does this issue occur?**

During the `install.sh` process, `unzip` is used to extract the zip archive.

**How can this issue be fixed?**

You can install unzip via `brew install unzip` on MacOS or `apt-get install unzip -y` on Linux.
