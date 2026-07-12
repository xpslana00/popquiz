$root = 'c:\Users\Marti\OneDrive\Dokumenty\GitHub\popquiz'
$prefix = 'http://127.0.0.1:8000/'
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving $root at $prefix"

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $requestPath = $context.Request.Url.AbsolutePath
    if ([string]::IsNullOrWhiteSpace($requestPath) -or $requestPath -eq '/') {
      $requestPath = '/index.html'
    }

    $relative = $requestPath.TrimStart('/')
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
    $rootFull = [System.IO.Path]::GetFullPath($root)

    if (-not $fullPath.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $buffer = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
      $context.Response.ContentLength64 = $buffer.Length
      $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
      $context.Response.Close()
      continue
    }

    if ([System.IO.Directory]::Exists($fullPath)) {
      $fullPath = [System.IO.Path]::Combine($fullPath, 'index.html')
    }

    if ([System.IO.File]::Exists($fullPath)) {
      $extension = [System.IO.Path]::GetExtension($fullPath)
      $contentType = 'text/html'
      switch ($extension) {
        '.css' { $contentType = 'text/css' }
        '.js' { $contentType = 'text/javascript' }
        '.json' { $contentType = 'application/json' }
        '.png' { $contentType = 'image/png' }
        '.jpg' { $contentType = 'image/jpeg' }
        '.svg' { $contentType = 'image/svg+xml' }
      }

      $buffer = [System.IO.File]::ReadAllBytes($fullPath)
      $context.Response.ContentType = $contentType
      $context.Response.ContentLength64 = $buffer.Length
      $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
    } else {
      $context.Response.StatusCode = 404
      $buffer = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
      $context.Response.ContentLength64 = $buffer.Length
      $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
    }

    $context.Response.Close()
  } catch {
    Write-Host $_.Exception.Message
  }
}
