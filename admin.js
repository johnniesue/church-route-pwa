const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

const churchLat = 32.9027
const churchLng = -96.5639
const churchAddress = "5001 Main St, Rowlett, TX 75088"

function formatAddress(address) {
  const parts = address.split(',')

  const line1 = parts[0]?.trim() || ''
  const city = parts[1]?.trim() || ''
  const state = parts[2]?.trim() || ''

  return `${line1}<br>${city}, ${state}`
}

const map = L.map("map").setView([churchLat, churchLng], 12)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map)

L.marker([churchLat, churchLng])
  .addTo(map)
  .bindPopup("Church")
  .openPopup()



let pinMarkers = []
let routeLine = null

loadPins()
loadPendingPickupCount()

setInterval(() => {
  loadPins()
  loadPendingPickupCount()
}, 10000)

async function loadPins() {
  // clear old pins
  pinMarkers.forEach(m => map.removeLayer(m))
  pinMarkers = []

  const { data, error } = await db
    .from("pickup_addresses")
    .select("id,name,address,lat,lng,status")
    .eq("status", "pending")

  if (error) {
    console.error("loadPins error:", error)
    return
  }
  if (!data) return

  data.forEach(row => {
    if (row.lat == null || row.lng == null) return

    // Don't pin the church if it somehow exists in table
    if (distanceMiles(churchLat, churchLng, Number(row.lat), Number(row.lng)) <= 0.15) return

    const marker = L.marker([row.lat, row.lng]).addTo(map)
    pinMarkers.push(marker)

    marker.bindPopup(`
      <b>${row.name}</b><br>
      ${formatAddress(row.address)}<br><br>
      <button onclick="dropOff('${row.id}')">Drop Off</button><br><br>
      <button onclick="deleteRider('${row.id}')" style="background:#dc3545;color:white;padding:8px;">DELETE</button>
    `)
    document.getElementById("pickupCount").innerText = data.length
  })
}

async function loadPendingPickupCount() {
  const { count, error } = await db
    .from("pickup_addresses")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")

  if (error) {
    console.error("pending count error:", error)
    return
  }

  const el = document.getElementById("pickupCount")
  if (el) el.innerText = count ?? 0
}


function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function buildRoute() {
  // IMPORTANT: use addresses to prevent Google replacing coords with POIs
  const { data, error } = await db
    .from("pickup_addresses")
    .select("address,lat,lng")
    .eq("status", "pending")

  if (error) {
    console.error("buildRoute error:", error)
    alert("Error loading stops")
    return
  }

  if (!data || data.length === 0) {
    alert("No pending stops")
    return
  }

  // Keep only rows with an address, and exclude anything basically at/near church
  let stops = data
    .map(x => ({
      address: (x.address || "").trim(),
      lat: Number(x.lat),
      lng: Number(x.lng),
    }))
    .filter(x => x.address.length > 0)
    .filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng))
    .filter(x => distanceMiles(churchLat, churchLng, x.lat, x.lng) > 0.15)

  // De-dupe by normalized address
  const seen = new Set()
  stops = stops.filter(x => {
    const key = x.address.toLowerCase().replace(/\s+/g, " ").trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (stops.length === 0) {
    alert("No valid stops")
    return
  }

  const origin = encodeURIComponent(churchAddress)
  const destination = encodeURIComponent(churchAddress)

  // Google expects waypoints separated by | (addresses work best)
  const waypointString = stops.map(x => x.address).join("|")
  const waypoints = encodeURIComponent(waypointString)

  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin}` +
    `&destination=${destination}` +
    `&travelmode=driving` +
    `&waypoints=${waypoints}`

  window.location.href = url
}

async function dropOff(id) {
  const { error } = await db
    .from("pickup_addresses")
    .update({ status: "dropped_off", dropped_at: new Date() })
    .eq("id", id)

  if (error) {
    console.error("dropOff error:", error)
    alert("Error updating stop")
    return
  }

  loadPins()
  loadPendingPickupCount()
}

async function deleteRider(id) {
  const confirmDelete = confirm("Delete this rider?")
  if (!confirmDelete) return

  const { error } = await db
    .from("pickup_addresses")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("delete error:", error)
    alert("Error deleting rider")
    return
  }

  async function drawRoute() {
  const { data, error } = await db
    .from("pickup_addresses")
    .select("lat,lng")
    .eq("status", "pending")

  if (error) {
    console.error("drawRoute error:", error)
    alert("Error loading route stops")
    return
  }

  if (!data || data.length === 0) {
    alert("No pending stops")
    return
  }

  const stops = data
    .map(x => ({
      lat: Number(x.lat),
      lng: Number(x.lng)
    }))
    .filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng))
    .filter(x => distanceMiles(churchLat, churchLng, x.lat, x.lng) > 0.15)

  if (stops.length === 0) {
    alert("No valid stops")
    return
  }

  const routeCoords = [
    `${churchLng},${churchLat}`,
    ...stops.map(x => `${x.lng},${x.lat}`),
    `${churchLng},${churchLat}`
  ].join(";")

  const url = `https://router.project-osrm.org/route/v1/driving/${routeCoords}?overview=full&geometries=geojson`

  const res = await fetch(url)
  const json = await res.json()

  if (!json.routes || !json.routes.length) {
    alert("No route found")
    return
  }

  if (routeLine) {
    map.removeLayer(routeLine)
  }

  routeLine = L.geoJSON(json.routes[0].geometry, {
    style: {
      color: "blue",
      weight: 4
    }
  }).addTo(map)

  map.fitBounds(routeLine.getBounds(), { padding: [30, 30] })
}

  loadPins()
  loadPendingPickupCount()
}
