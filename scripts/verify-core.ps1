#Requires -Version 7.0
param([string]$BaseUrl = 'http://localhost:3000')
$ErrorActionPreference = 'Stop'
$secureDemoPassword = Read-Host 'Contraseña de los usuarios demo' -AsSecureString
$demoPassword = [System.Net.NetworkCredential]::new('', $secureDemoPassword).Password

function Get-DemoToken([string]$Email, [string]$Tenant) {
    $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/login" `
        -Headers @{ 'x-tenant-id' = $Tenant } -ContentType 'application/json' `
        -Body (@{ email = $Email; password = $demoPassword } | ConvertTo-Json)
    return $response.data.accessToken
}
function Test-Request([string]$Label, [string]$Path, [hashtable]$Headers, [int]$Expected, [string]$Method = 'GET', $Body = $null) {
    $parameters = @{ Uri = "$BaseUrl$Path"; Headers = $Headers; Method = $Method; SkipHttpErrorCheck = $true }
    if ($null -ne $Body) { $parameters.ContentType = 'application/json'; $parameters.Body = $Body | ConvertTo-Json }
    $response = Invoke-WebRequest @parameters
    if ([int]$response.StatusCode -ne $Expected) { throw "$Label : HTTP $($response.StatusCode), esperado $Expected" }
    Write-Output "$Label : HTTP $Expected OK"
}
try {
    $acmeToken = Get-DemoToken 'admin@acme.io' 'tenant-acme'
    $globalToken = Get-DemoToken 'admin@global.io' 'tenant-global'
    $salesToken = Get-DemoToken 'sales@acme.io' 'tenant-acme'
    Write-Output 'Login ACME, GLOBAL y SALES: OK (tokens ocultos)'
    $acme = @{ Authorization = "Bearer $acmeToken"; 'x-tenant-id' = 'tenant-acme' }
    $global = @{ Authorization = "Bearer $globalToken"; 'x-tenant-id' = 'tenant-global' }
    $sales = @{ Authorization = "Bearer $salesToken"; 'x-tenant-id' = 'tenant-acme' }
    Test-Request 'ACME /me' '/api/v1/auth/me' $acme 200
    Test-Request 'Tenant context' '/api/v1/tenants/context' $acme 200
    Test-Request 'Countries shared' '/api/v1/master-data/countries' $acme 200
    Test-Request 'GLOBAL /me' '/api/v1/auth/me' $global 200
    Test-Request 'GLOBAL login into ACME denied' '/api/v1/auth/login' @{ 'x-tenant-id' = 'tenant-acme' } 403 'POST' @{ email = 'admin@global.io'; password = $demoPassword }
    Test-Request 'ACME token / GLOBAL header' '/api/v1/auth/me' @{ Authorization = "Bearer $acmeToken"; 'x-tenant-id' = 'tenant-global' } 403
    Test-Request 'GLOBAL token / ACME header' '/api/v1/tenants/context' @{ Authorization = "Bearer $globalToken"; 'x-tenant-id' = 'tenant-acme' } 403
    Test-Request 'SALES insufficient grants' '/api/v1/audit' $sales 403
    Test-Request 'SALES read permission' '/api/v1/master-data/countries' $sales 200
    Test-Request 'Real tenant-scoped audit endpoint' '/api/v1/audit?limit=10' $acme 200
    Test-Request 'Cross-tenant profile denied' '/api/v1/tenants/tenant-global' $acme 403
    Test-Request 'Missing tenant' '/api/v1/auth/me' @{ Authorization = "Bearer $acmeToken" } 401
    Test-Request 'Missing token' '/api/v1/auth/me' @{ 'x-tenant-id' = 'tenant-acme' } 401
} finally {
    $demoPassword = $null
    $acmeToken = $null
    $globalToken = $null
    $salesToken = $null
}
