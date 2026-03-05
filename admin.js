const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

const churchLat = 32.9027
const churchLng = -96.5639

const map = L.map("map").setView([churchLat, churchLng], 12)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map)

L.marker([churchLat, churchLng])
  .addTo(map)
  .bindPopup("Church")
  .openPopup()

let pinMarkers = []

loadPins()
setInterval(loadPins, 10000)

async function loadPins() {
  // clear old pins
  pinMarkers.forEach(m => map.removeLayer(m))
  pinMarkers = []

  const { data, error } = await db
    .from("pickup_addresses")
    .select("id,name,address,lat,lng")
    .eq("status", "pending")

  if (error) {
    console.error(error)
    return
  }
  if (!data) return

  data.forEach(row => {
    if (row.lat == null || row.lng == null) return

    // don't pin the church if it somehow exists in table
    if (distanceMiles(churchLat, churchLng, Number(row.lat), Number(row.lng)) <= 0.15) return

    const marker = L.marker([row.lat, row.lng]).addTo(map)
    pinMarkers.push(marker)

    marker.bindPopup(`
      <b>${row.name}</b><br>
      ${row.address}<br><br>
      <button onclick="dropOff('${row.id}')">Drop Off</button>
    `)
  })
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
  const { data, error } = await db
    .from("pickup_addresses")
    .select("lat,lng")
    .eq("status", "pending")

  if (error) {
    console.error(error)
    alert("Error loading stops")
    return
  }

  if (!data || data.length === 0) {
    alert("No pending stops")
    return
  }

  // Use the ADDRESS so Google shows "5001 Main St" (not "Village of Rowlett")
  const churchAddress = "5001 Main St, Rowlett, TX 75088"
  const origin = encodeURIComponent(churchAddress)
  const destination = encodeURIComponent(churchAddress)

  // valid stops only
  let stops = data
    .map(x => ({ lat: Number(x.lat), lng: Number(x.lng) }))
    .filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng))

  // Remove anything basically at/near the church (prevents church showing as a middle stop)
  stops = stops.filter(x => distanceMiles(churchLat, churchLng, x.lat, x.lng) > 0.15)

  // Remove duplicates
  const seen = new Set()
  stops = stops.filter(x => {
    const key = `${x.lat.toFixed(6)},${x.lng.toFixed(6)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (stops.length === 0) {
    alert("No valid stops")
    return
  }

  const waypointString = stops.map(x => `${x.lat},${x.lng}`).join("|")
  const waypoints = encodeURIComponent(waypointString)

  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin}` +
    `&destination=${destination}` +
    `&travelmode=driving` +
    `&waypoints=${waypoints}`

  window.open(url, "_blank")
}

async function dropOff(id) {
  const { error } = await db
    .from("pickup_addresses")
    .update({ status: "dropped_off", dropped_at: new Date() })
    .eq("id", id)

  if (error) {
    console.error(error)
    alert("Error updating stop")
    return
  }

  loadPins()
}
