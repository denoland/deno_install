# deno_install

**One-line commands to install Deno on your system.**

[![Build Status](https://github.com/denoland/deno_install/workflows/ci/badge.svg?branch=master)](https://github.com/denoland/deno_install/actions)

## Install Latest Version

**With Shell:**

```sh
curl -fsSL https://deno.land/install.sh | sh
```

**With PowerShell:**

```powershell
irm https://deno.land/install.ps1 | iex
```

## Install Specific Version

**With Shell:**

```sh
curl -fsSL https://deno.land/install.sh | sh -s v1.0.0
```

**With PowerShell:**

```powershell
$v="1.0.0"; irm https://deno.land/install.ps1 | iex
```

## Install via Package Manager

**With
[winget](https://github.com/microsoft/winget-pkgs/tree/master/manifests/d/DenoLand/Deno):**

```powershell
winget install deno
```

**With
[Scoop](https://github.com/ScoopInstaller/Main/blob/master/bucket/deno.json):**

```powershell
scoop install deno
```

**With [Homebrew](https://formulae.brew.sh/formula/deno):**

```sh
brew install deno
```

**With [Macports](https://ports.macports.org/port/deno/summary):**

```sh
sudo port install deno
```

**With [Chocolatey](https://chocolatey.org/packages/deno):**

```powershell
choco install deno
```

**With [Snap](https://snapcraft.io/deno):**

```sh
sudo snap install deno
```

**With [Pacman](https://www.archlinux.org/pacman/):**

```sh
pacman -S deno
```

**With [Zypper](https://software.opensuse.org/package/deno):**

```sh
zypper install deno
```

**Build and install from source using [Cargo](https://lib.rs/crates/deno):**

```sh
# Install the Protobuf compiler
apt install -y protobuf-compiler # Linux
brew install protobuf # macOS

# Build and install Deno
cargo install deno
```

## Install and Manage Multiple Versions

**With [asdf](https://asdf-vm.com) and
[asdf-deno](https://github.com/asdf-community/asdf-deno):**

```sh
asdf plugin add deno

# Get latest version of deno available
DENO_LATEST=$(asdf latest deno)

asdf install deno $DENO_LATEST

# Activate globally with:
asdf global deno $DENO_LATEST

# Activate locally in the current folder with:
asdf local deno $DENO_LATEST

#======================================================
# If you want to install specific version of deno then use that version instead
# of DENO_LATEST variable example
asdf install deno 1.0.0

# Activate globally with:
asdf global deno 1.0.0

# Activate locally in the current folder with:
asdf local deno 1.0.0
```

**With
[Scoop](https://github.com/lukesampson/scoop/wiki/Switching-Ruby-And-Python-Versions):**

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
  curl -fsSL https://deno.land/install.sh | sudo DENO_INSTALL=/usr/local sh
  ```

  **With PowerShell (`C:\Program Files\deno`):**

  ```powershell
  # Run as administrator:
  $env:DENO_INSTALL = "C:\Program Files\deno"
  irm https://deno.land/install.ps1 | iex
  ```

## Verification

As an additional layer of security, you can verify the integrity of the shell
installer against the provided checksums.

```sh
curl -fLso install.sh https://deno.land/install.sh
```

Verify the SHA256 checksum of the installer:

```sh
curl -s https://raw.githubusercontent.com/denoland/deno_install/master/SHA256SUM | sha256sum --check --ignore-missing
```

## Compatibility

- The Shell installer can be used on Windows with
  [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/about),
  [MSYS](https://www.msys2.org) or equivalent set of tools.

## Known Issues

### either unzip or 7z is required

To decompress the `deno` archive, one of either
[`unzip`](https://linux.die.net/man/1/unzip) or
[`7z`](https://linux.die.net/man/1/7z) must be available on the target system.

```sh
$ curl -fsSL https://deno.land/install.sh | sh
Error: either unzip or 7z is required to install Deno (see: https://github.com/denoland/deno_install#either-unzip-or-7z-is-required ).
```

**When does this issue occur?**

During the `install.sh` process, `unzip` or `7z` is used to extract the zip
archive.

**How can this issue be fixed?**

You can install unzip via `brew install unzip` on MacOS or
`sudo apt-get install unzip -y` on Linux.
