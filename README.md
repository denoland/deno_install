# deno_install

**One-line commands to install Deno on your system.**

| **Linux & Mac** | **Windows** |
|:---------------:|:-----------:|
| [![Build Status](https://travis-ci.com/denoland/deno_install.svg?branch=master)](https://travis-ci.com/denoland/deno_install) | [![Build status](https://ci.appveyor.com/api/projects/status/gtekeaf7r60xa896?branch=master&svg=true)](https://ci.appveyor.com/project/deno/deno-install) |

## Install Latest Version

**With Shell:**

```sh
curl -L https://deno.land/x/install/install.sh | sh
```

**With PowerShell:**

```powershell
iwr https://deno.land/x/install/install.ps1 | iex
```

## Install Specific Version

**With Shell:**

```sh
curl -L https://deno.land/x/install/install.sh | sh -s v0.2.10
```

**With PowerShell:**

```powershell
iwr https://deno.land/x/install/install.ps1 -out install.ps1; .\install.ps1 v0.2.10
```

## Install via Package Manager

**With [Scoop](https://scoop.sh):**

```powershell
scoop install deno
```

**With [Homebrew](https://brew.sh/):**

_Cooming soon!_

See [denoland/deno#1486](https://github.com/denoland/deno/issues/1486).

## Compatibility

- The Shell installer can be used on Windows via the [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/about).
- The PowerShell installer can be used on Linux and Mac thanks to [PowerShell Core](https://docs.microsoft.com/en-us/powershell/scripting).

## Known Issues

### Could not create SSL/TLS secure channel

```
PS C:\> iwr https://deno.land/x/install/install.ps1 | iex
iwr : The request was aborted: Could not create SSL/TLS secure channel.
At line:1 char:1
+ iwr https://deno.land/x/install/install.ps1 | iex
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (System.Net.HttpWebRequest:HttpWebRequest) [Invoke-WebRequest], WebException
    + FullyQualifiedErrorId : WebCmdletWebResponseException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand
```

**When does this issue occur?**

If your systems' [ServicePointManager](https://docs.microsoft.com/en-us/dotnet/api/system.net.servicepointmanager.securityprotocol) is configured to use an out-dated security protocol, such as, TLS 1.0.

**How can this issue be fixed?**

Configure your system to use an up-to-date security protocol, such as, TLS 1.2:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
```

### Running scripts is disabled

```
PS C:\> iwr https://deno.land/x/install/install.ps1 -out install.ps1; .\install.ps1 v0.2.10
.\install.ps1 : File C:\install.ps1 cannot be loaded because running scripts is disabled on this system. For more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:1 char:63
+ ... no.land/x/install/install.ps1 -out install.ps1; .\install.ps1 v0.2.10
+                                                     ~~~~~~~~~~~~~
    + CategoryInfo          : SecurityError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

**When does this issue occur?**

If your systems' [ExecutionPolicy](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies) is `Undefined` or `Restricted`.

**How can this issue be fixed?**

Allow scripts that are downloaded from the internet to be executed by setting the execution policy to `RemoteSigned`:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```
