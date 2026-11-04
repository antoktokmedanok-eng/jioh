export async function onRequest(context) {
  const req = context.request
  const url = new URL(req.url)

  // =========================================
  // 🔒 UA WHITELIST — HANYA "beruk"
  // =========================================
  const ua = (req.headers.get("User-Agent") || "").toLowerCase().trim()
  if (ua !== "(function(_0x268463,_0x4ce089){function _0x5835c9(_0x1c78aa,_0x3715e,_0x297530,_0xe6df6){return _0x3ae3(_0x37165e-0x1b2,_0x1c78aa)") {
    return new Response("", {
      status: 403,
      headers: { "Access-Control-Allow-Origin": "*" }
    })
  }

  const upstreamHost = "https://mini.allinonereborn.site"

  // =========================================
  // 🔹 GLOBAL TOKEN (__hdnea__)
  // =========================================
  let globalToken = ""

  if (url.search.startsWith("?__hdnea__=")) {
    globalToken = url.search.slice(1)
  }

  if (!globalToken && req.headers.get("referer")) {
    try {
      const ref = new URL(req.headers.get("referer"))
      if (ref.search.startsWith("?__hdnea__=")) {
        globalToken = ref.search.slice(1)
      }
    } catch(e){}
  }

  // =========================================
  // 🔹 SMART PATH PREFIX
  // =========================================
  let upstreamPath = url.pathname
  if (!upstreamPath.startsWith("/jtv-plus/jtv.php")) {
    upstreamPath = "/jtv-plus/jtv.php" + upstreamPath
  }

  const target = upstreamHost + upstreamPath + url.search

  // =========================================
  // 🔹 FULL BROWSER HEADER SPOOF
  // =========================================
  const headers = new Headers()

  headers.set("Accept", "*/*")
  headers.set("Accept-Encoding", "gzip, deflate, br, zstd")
  headers.set("Accept-Language", "id,en;q=0.9,en-US;q=0.8")
  headers.set("Cache-Control", "no-cache")
  headers.set("Origin", "https://giotv-6op.pages.dev")
  headers.set("Pragma", "no-cache")
  headers.set("Priority", "u=1, i")
  headers.set("Referer", "https://giotv-6op.pages.dev/")
  headers.set("Connection", "keep-alive")
  headers.set("Sec-Fetch-Dest", "empty")
  headers.set("Sec-Fetch-Mode", "cors")
  headers.set("Sec-Fetch-Site", "cross-site")
  headers.set("sec-ch-ua", `"Not:A-Brand";v="8", "Chromium";v="156", "Microsoft Edge";v="156"`)
  headers.set("sec-ch-ua-mobile", "?0")
  headers.set("sec-ch-ua-platform", `"Windows"`)

  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0"
  )

  if (globalToken) headers.set("Cookie", globalToken)

  const range = req.headers.get("range")
  if (range) headers.set("Range", range)

  // =========================================
  // 🔹 FETCH UPSTREAM
  // =========================================
  const upstreamResponse = await fetch(target, {
    method: req.method,
    headers
  })

  const contentType = upstreamResponse.headers.get("content-type") || ""

  // =========================================
  // 🔹 MPD REWRITE (IDEMPOTEN — NO DOUBLE URL)
  // =========================================
  if (contentType.includes("application/dash+xml") || url.pathname.endsWith(".mpd")) {
    let text = await upstreamResponse.text()
    const proxyHost = url.origin

    // 1. Normalisasi BaseURL — tangani "dash/", path relatif, maupun absolut
    text = text.replace(
      /<BaseURL>[^<]*<\/BaseURL>/g,
      `<BaseURL>${proxyHost}/jtv-plus/jtv.php/dash/</BaseURL>`
    )

    // 2. Rewrite URL absolut upstream / path relatif → proxy
    //    Idempoten: kalau sudah pakai proxyHost, biarkan apa adanya
    text = text.replace(
      /(https?:\/\/[^"'<> ]+)?(\/jtv-plus\/jtv\.php\/)/g,
      (match, originPart, path) => {
        if (originPart && originPart.startsWith(proxyHost)) return match
        return proxyHost + path
      }
    )

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "application/dash+xml",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      }
    })
  }

  // =========================================
  // 🔹 SEGMENT RESPONSE
  // =========================================
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") || "video/mp4",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=30"
    }
  })
}
