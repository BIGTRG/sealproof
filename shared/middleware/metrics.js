/**
 * Prometheus Metrics Middleware
 *
 * Exposes /metrics endpoint for Prometheus scraping.
 * Tracks: request count, latency histogram, active connections,
 * error rate, and custom business metrics.
 *
 * Compatible with existing TRG Prometheus + Grafana stack.
 */

// ---------------------------------------------------------------------------
// In-memory metrics store (lightweight, no prom-client dependency)
// ---------------------------------------------------------------------------
const metrics = {
  // HTTP request counters
  requestsTotal: {},      // {method_path_status: count}
  requestDuration: [],    // [{method, path, status, durationMs}]

  // Business metrics
  counters: {},           // {name: count}
  gauges: {},             // {name: value}

  // Reset duration buffer periodically
  _maxDurationEntries: 10000,
};

// ---------------------------------------------------------------------------
// Request tracking middleware
// ---------------------------------------------------------------------------
function requestMetrics(serviceName) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const path = normalizePath(req.route?.path || req.path);
      const key = `${req.method}|${path}|${res.statusCode}`;

      // Increment counter
      metrics.requestsTotal[key] = (metrics.requestsTotal[key] || 0) + 1;

      // Record duration (ring buffer)
      if (metrics.requestDuration.length >= metrics._maxDurationEntries) {
        metrics.requestDuration.shift();
      }
      metrics.requestDuration.push({
        service: serviceName,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs,
        timestamp: Date.now(),
      });
    });

    next();
  };
}

// ---------------------------------------------------------------------------
// Custom metric helpers
// ---------------------------------------------------------------------------
function incrementCounter(name, labels = {}, amount = 1) {
  const key = formatKey(name, labels);
  metrics.counters[key] = (metrics.counters[key] || 0) + amount;
}

function setGauge(name, value, labels = {}) {
  const key = formatKey(name, labels);
  metrics.gauges[key] = value;
}

// ---------------------------------------------------------------------------
// /metrics endpoint handler (Prometheus text format)
// ---------------------------------------------------------------------------
function metricsEndpoint(serviceName) {
  return (req, res) => {
    const lines = [];

    // HTTP request total
    lines.push('# HELP sealproof_http_requests_total Total HTTP requests');
    lines.push('# TYPE sealproof_http_requests_total counter');
    for (const [key, count] of Object.entries(metrics.requestsTotal)) {
      const [method, path, status] = key.split('|');
      lines.push(`sealproof_http_requests_total{service="${serviceName}",method="${method}",path="${path}",status="${status}"} ${count}`);
    }

    // HTTP request duration (compute percentiles from recent data)
    const recentDurations = metrics.requestDuration
      .filter((d) => d.service === serviceName && Date.now() - d.timestamp < 300000) // last 5 min
      .map((d) => d.durationMs)
      .sort((a, b) => a - b);

    if (recentDurations.length > 0) {
      lines.push('# HELP sealproof_http_request_duration_ms HTTP request duration in milliseconds');
      lines.push('# TYPE sealproof_http_request_duration_ms summary');
      const p50 = percentile(recentDurations, 50);
      const p95 = percentile(recentDurations, 95);
      const p99 = percentile(recentDurations, 99);
      lines.push(`sealproof_http_request_duration_ms{service="${serviceName}",quantile="0.5"} ${p50.toFixed(2)}`);
      lines.push(`sealproof_http_request_duration_ms{service="${serviceName}",quantile="0.95"} ${p95.toFixed(2)}`);
      lines.push(`sealproof_http_request_duration_ms{service="${serviceName}",quantile="0.99"} ${p99.toFixed(2)}`);
      lines.push(`sealproof_http_request_duration_ms_count{service="${serviceName}"} ${recentDurations.length}`);
    }

    // Custom counters
    for (const [key, count] of Object.entries(metrics.counters)) {
      const { name, labels } = parseKey(key);
      const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
      lines.push(`sealproof_${name}{service="${serviceName}"${labelStr ? ',' + labelStr : ''}} ${count}`);
    }

    // Custom gauges
    for (const [key, value] of Object.entries(metrics.gauges)) {
      const { name, labels } = parseKey(key);
      const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
      lines.push(`sealproof_${name}{service="${serviceName}"${labelStr ? ',' + labelStr : ''}} ${value}`);
    }

    // Process metrics
    const mem = process.memoryUsage();
    lines.push(`# HELP process_resident_memory_bytes Resident memory size in bytes`);
    lines.push(`# TYPE process_resident_memory_bytes gauge`);
    lines.push(`process_resident_memory_bytes{service="${serviceName}"} ${mem.rss}`);
    lines.push(`process_heap_used_bytes{service="${serviceName}"} ${mem.heapUsed}`);
    lines.push(`process_uptime_seconds{service="${serviceName}"} ${Math.floor(process.uptime())}`);

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.end(lines.join('\n') + '\n');
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizePath(path) {
  // Replace UUIDs and numeric IDs with :id
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}

function formatKey(name, labels) {
  const labelStr = Object.entries(labels).sort().map(([k, v]) => `${k}=${v}`).join(',');
  return labelStr ? `${name}{${labelStr}}` : name;
}

function parseKey(key) {
  const match = key.match(/^(.+?)\{(.+)\}$/);
  if (!match) return { name: key, labels: {} };
  const labels = {};
  match[2].split(',').forEach((pair) => {
    const [k, v] = pair.split('=');
    labels[k] = v;
  });
  return { name: match[1], labels };
}

function percentile(sorted, pct) {
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

module.exports = {
  requestMetrics,
  metricsEndpoint,
  incrementCounter,
  setGauge,
};
