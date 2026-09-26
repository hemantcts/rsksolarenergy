<?php
/*
 * Records a tap on a WhatsApp or call button. See files/DEPLOY.md, "Enquiry taps".
 *
 * The only server code on the site, on a host whose previous install was compromised, so it is
 * written to accept as little as possible: two methods, one small JSON body, every field checked
 * against what it is allowed to be, a per-address rate limit, and a size cap on the log.
 *
 * The log sits outside the web root, so nobody can download it and the deploy (rsync --delete)
 * never touches it. The weekly report reads it over SSH. Kept for twelve months; the report job
 * deletes older files.
 *
 * Written for PHP 7.4 and up, whatever the host happens to be running.
 */
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

// public_html/api/tap.php, two levels up is the domain folder that holds public_html.
$dir = dirname(__DIR__, 2) . '/rsk-taps';
$ip = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP) ?: '';

function ready(string $dir): bool
{
    return (is_dir($dir) || @mkdir($dir, 0700, true)) && is_writable($dir);
}

function done(int $status): void
{
    http_response_code($status);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';

// Health check, used by the deploy. It says whether taps can be stored and echoes the caller's own
// address, which confirms the server sees real visitor addresses. It never returns stored data.
if ($method === 'GET' || $method === 'HEAD') {
    $ok = ready($dir);
    http_response_code($ok ? 200 : 503);
    header('Content-Type: text/plain; charset=utf-8');
    if ($method === 'GET') {
        echo ($ok ? 'ok' : 'storage unavailable') . "\nyou: " . $ip . "\n";
    }
    exit;
}

if ($method !== 'POST') {
    header('Allow: GET, HEAD, POST');
    done(405);
}

// Only our own pages send these. A determined script could fake the header, which is what the
// rate limit and the size caps are for; this keeps out the casual noise.
$ours = '#^https://(www\.)?rsksolarenergy\.com(/|$)#';
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$referer = (string) ($_SERVER['HTTP_REFERER'] ?? '');
if (!preg_match($ours, $origin) && !preg_match($ours, $referer)) {
    done(403);
}
if ($ip === '') {
    done(400);
}
if (!ready($dir)) {
    done(503);
}

// Thirty taps an hour from one address is far beyond anybody genuinely trying to reach us.
$limits = $dir . '/rate';
if (!is_dir($limits)) {
    @mkdir($limits, 0700, true);
}
$bucket = $limits . '/' . hash('sha256', $ip . gmdate('YmdH'));
$count = (int) @file_get_contents($bucket);
if ($count >= 30) {
    done(429);
}
@file_put_contents($bucket, (string) ($count + 1), LOCK_EX);
if (random_int(1, 50) === 1) {
    foreach (glob($limits . '/*') ?: [] as $old) {
        if (@filemtime($old) < time() - 7200) {
            @unlink($old);
        }
    }
}

$raw = (string) file_get_contents('php://input', false, null, 0, 2048);
$data = json_decode($raw, true);
if (!is_array($data)) {
    done(400);
}

/** A string field with control characters and line breaks removed, cut to a length. */
function field($value, int $max): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value);
    if ($value === null) {
        return ''; // Not valid UTF-8.
    }
    $value = trim($value);
    return function_exists('mb_substr') ? mb_substr($value, 0, $max, 'UTF-8') : substr($value, 0, $max);
}

$type = $data['type'] ?? '';
if ($type !== 'whatsapp' && $type !== 'call') {
    done(400);
}

$number = substr((string) preg_replace('/[^0-9+]/', '', (string) ($data['number'] ?? '')), 0, 16);
/** A site path, or "/" when it is anything other than a plain path on this site. */
function site_path($value): string
{
    $path = field($value, 200);
    return preg_match('#^/[A-Za-z0-9/._%-]*$#', $path) ? $path : '/';
}

$page = site_path($data['page'] ?? '');
$landing = site_path($data['landing'] ?? '');
$button = field($data['button'] ?? '', 120);
$source = field($data['source'] ?? '', 120);
$agent = field($_SERVER['HTTP_USER_AGENT'] ?? '', 300);

// One file a month. A cap far beyond any real volume means a flood fills a file, not the disk.
$file = $dir . '/' . gmdate('Y-m') . '.csv';
if (is_file($file) && filesize($file) > 25 * 1024 * 1024) {
    done(507);
}

$new = !is_file($file);
$fh = @fopen($file, 'ab');
if ($fh === false) {
    done(503);
}
if (flock($fh, LOCK_EX)) {
    if ($new) {
        fputcsv($fh, ['time_utc', 'type', 'number', 'page', 'button', 'landing_page', 'source', 'ip', 'user_agent'], ',', '"', '');
        @chmod($file, 0600);
    }
    fputcsv($fh, [gmdate('Y-m-d\TH:i:s\Z'), $type, $number, $page, $button, $landing, $source, $ip, $agent], ',', '"', '');
    fflush($fh);
    flock($fh, LOCK_UN);
}
fclose($fh);

done(204);
