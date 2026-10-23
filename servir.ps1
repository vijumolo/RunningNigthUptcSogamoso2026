param(
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$port = 8123
$root = (Resolve-Path $PSScriptRoot).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host ""
    Write-Host "No se pudo iniciar el servidor en el puerto $port." -ForegroundColor Red
    Write-Host "Puede que el puerto esté ocupado o falten permisos. Abre directamente index.html." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

$mime = @{
    '.html'        = 'text/html; charset=utf-8'
    '.htm'         = 'text/html; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.js'          = 'application/javascript; charset=utf-8'
    '.json'        = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.jpg'         = 'image/jpeg'
    '.jpeg'        = 'image/jpeg'
    '.png'         = 'image/png'
    '.svg'         = 'image/svg+xml'
    '.pdf'         = 'application/pdf'
    '.ico'         = 'image/x-icon'
}

Write-Host ""
Write-Host "  Running Night Upetecista 2026" -ForegroundColor Yellow
Write-Host "  Servidor local: http://localhost:$port/" -ForegroundColor Yellow
Write-Host "  Carpeta: $root" -ForegroundColor DarkGray
Write-Host "  Presiona Ctrl + C para detener." -ForegroundColor DarkGray
Write-Host ""

if (-not $NoBrowser) {
    Start-Process "http://localhost:$port/"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $request = $context.Request
            $response = $context.Response

            $relative = [Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }

            $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
            $isInside = $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)

            if (-not $isInside -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
                $response.StatusCode = 404
                $response.ContentType = 'text/plain; charset=utf-8'
                $body = [Text.Encoding]::UTF8.GetBytes('404 - Archivo no encontrado')
                $response.ContentLength64 = $body.Length
                if ($request.HttpMethod -ne 'HEAD') {
                    $response.OutputStream.Write($body, 0, $body.Length)
                }
                $response.Close()
                continue
            }

            $extension = [IO.Path]::GetExtension($path).ToLowerInvariant()
            $contentType = $mime[$extension]
            if (-not $contentType) { $contentType = 'application/octet-stream' }

            $bytes = [IO.File]::ReadAllBytes($path)
            $response.ContentType = $contentType
            $response.AddHeader('Cache-Control', 'no-cache')
            $response.AddHeader('Accept-Ranges', 'bytes')

            $range = $request.Headers['Range']
            $handledRange = $false

            if ($range -and $range -match '^bytes=(\d*)-(\d*)$') {
                $startText = $matches[1]
                $endText = $matches[2]
                $total = $bytes.Length
                $start = 0
                $end = $total - 1

                if ([string]::IsNullOrEmpty($startText)) {
                    if (-not [string]::IsNullOrEmpty($endText)) {
                        $suffix = [int]$endText
                        $start = [Math]::Max(0, $total - $suffix)
                    }
                } else {
                    $start = [int]$startText
                    if (-not [string]::IsNullOrEmpty($endText)) { $end = [int]$endText }
                }

                if ($start -ge 0 -and $start -lt $total -and $end -ge $start) {
                    $end = [Math]::Min($end, $total - 1)
                    $length = $end - $start + 1
                    $response.StatusCode = 206
                    $response.AddHeader('Content-Range', "bytes $start-$end/$total")
                    $response.ContentLength64 = $length
                    if ($request.HttpMethod -ne 'HEAD') {
                        $response.OutputStream.Write($bytes, $start, $length)
                    }
                    $handledRange = $true
                }
            }

            if (-not $handledRange) {
                $response.ContentLength64 = $bytes.Length
                if ($request.HttpMethod -ne 'HEAD') {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            }

            $response.Close()
        } catch {
            try { $context.Response.StatusCode = 500; $context.Response.Close() } catch { }
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
