
$count = 10000

Write-Host "Benchmarking Array += with $count items..."
$arrayTime = Measure-Command {
    $arr = @()
    for ($i = 0; $i -lt $count; $i++) {
        $arr += "Item $i"
    }
}
Write-Host "Array += took: $($arrayTime.TotalMilliseconds) ms"

Write-Host "Benchmarking List.Add with $count items..."
$listTime = Measure-Command {
    $list = New-Object System.Collections.Generic.List[string]
    for ($i = 0; $i -lt $count; $i++) {
        $list.Add("Item $i")
    }
}
Write-Host "List.Add took: $($listTime.TotalMilliseconds) ms"

$improvement = ($arrayTime.TotalMilliseconds - $listTime.TotalMilliseconds) / $arrayTime.TotalMilliseconds * 100
Write-Host "Improvement: $($improvement.ToString("F2"))%"
