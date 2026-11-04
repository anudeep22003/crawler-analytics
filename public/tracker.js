(function () {
  var script = document.currentScript;
  var siteId = script && script.getAttribute("data-site-id");
  var collectorUrl = script && script.getAttribute("data-collector-url");
  if (!siteId || !collectorUrl) return;

  fetch(collectorUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ site_id: siteId, page_url: window.location.href }),
    credentials: "omit",
    keepalive: true,
  }).catch(function () {
    // Analytics must not interrupt the customer's page if collection is unavailable.
  });
})();
