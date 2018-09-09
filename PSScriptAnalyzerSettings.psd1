# See: https://github.com/PowerShell/PSScriptAnalyzer
@{
	IncludeRules = @(
		# Default Rules
		'PSUseApprovedVerbs',
		'PSReservedCmdletChar',
		'PSReservedParams',
		'PSShouldProcess',
		'PSUseSingularNouns',
		'PSMissingModuleManifestField',
		'PSAvoidDefaultValueSwitchParameter',
		'PSAvoidUsingCmdletAliases',
		'PSAvoidUsingWMICmdlet',
		'PSAvoidUsingEmptyCatchBlock',
		'PSUseCmdletCorrectly',
		'PSUseShouldProcessForStateChangingFunctions',
		'PSAvoidUsingPositionalParameters',
		'PSAvoidGlobalVars',
		'PSUseDeclaredVarsMoreThanAssignments',
		'PSAvoidUsingInvokeExpression',
		# Formatting Rules
		'PSPlaceOpenBrace',
		'PSPlaceCloseBrace',
		'PSUseConsistentWhitespace',
		'PSUseConsistentIndentation'
	)
	Rules = @{
		PSPlaceOpenBrace = @{
			Enable = $true
			OnSameLine = $true
			NewLineAfter = $false
			IgnoreOneLineBlock = $true
		}
		PSPlaceCloseBrace = @{
			Enable = $true
			NewLineAfter = $true
			IgnoreOneLineBlock = $true
			NoEmptyLineBefore = $true
		}
		PSUseConsistentIndentation = @{
			Enable = $true
			Kind = 'tab'
			IndentationSize = 1
		}
		PSUseConsistentWhitespace = @{
			Enable = $true
			CheckOpenBrace = $true
			CheckOpenParen = $true
			CheckOperator = $true
			CheckSeparator = $true
		}
	}
}