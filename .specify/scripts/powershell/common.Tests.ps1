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
