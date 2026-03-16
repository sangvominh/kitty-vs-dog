# Tests for common.ps1 functions

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "common.ps1")

Describe "Test-HasGit" {
    Context "When git command succeeds" {
        It "returns true" {
            Mock git {
                $global:LASTEXITCODE = 0
            }

            $result = Test-HasGit
            $result | Should -Be $true
        }
    }

    Context "When git command fails" {
        It "returns false" {
            Mock git {
                $global:LASTEXITCODE = 1
            }

            $result = Test-HasGit
            $result | Should -Be $false
        }
    }

    Context "When git command throws an exception" {
        It "returns false" {
            Mock git {
                throw "Git not found"
            }

            $result = Test-HasGit
            $result | Should -Be $false
        }
    }
}

Describe "Test-FileExists" {
    # Mock Write-Host to avoid polluting the test output
    Mock Write-Host {}

    Context "When file exists" {
        It "returns true" {
            Mock Test-Path { return $true } -ParameterFilter { $PathType -eq 'Leaf' }
            $result = Test-FileExists -Path "test.txt" -Description "Test File"
            $result | Should -Be $true
        }
    }

    Context "When file does not exist" {
        It "returns false" {
            Mock Test-Path { return $false }
            $result = Test-FileExists -Path "test.txt" -Description "Test File"
            $result | Should -Be $false
        }
    }
}

Describe "Test-DirHasFiles" {
    # Mock Write-Host to avoid polluting the test output
    Mock Write-Host {}

    Context "When directory has files" {
        It "returns true" {
            Mock Test-Path { return $true } -ParameterFilter { $PathType -eq 'Container' }
            Mock Get-ChildItem { return @([PSCustomObject]@{ PSIsContainer = $false }) }
            $result = Test-DirHasFiles -Path "testdir" -Description "Test Dir"
            $result | Should -Be $true
        }
    }

    Context "When directory is empty" {
        It "returns false" {
            Mock Test-Path { return $true } -ParameterFilter { $PathType -eq 'Container' }
            Mock Get-ChildItem { return @() }
            $result = Test-DirHasFiles -Path "testdir" -Description "Test Dir"
            $result | Should -Be $false
        }
    }

    Context "When directory only has subdirectories" {
        It "returns false" {
            Mock Test-Path { return $true } -ParameterFilter { $PathType -eq 'Container' }
            Mock Get-ChildItem { return @([PSCustomObject]@{ PSIsContainer = $true }) }
            $result = Test-DirHasFiles -Path "testdir" -Description "Test Dir"
            $result | Should -Be $false
        }
    }

    Context "When path is not a directory" {
        It "returns false" {
            Mock Test-Path { return $false } -ParameterFilter { $PathType -eq 'Container' }
            $result = Test-DirHasFiles -Path "testdir" -Description "Test Dir"
            $result | Should -Be $false
        }
    }
}
