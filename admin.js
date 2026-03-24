// ==============================
// 🔧 CONFIG / SETUP
// ==============================
const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ==============================
// 🧱 HELPERS
// ==============================
function formatAddress(address) {
  const parts = address.split(',')

  const line1 = parts[0]?.trim() || ''
  const city = parts[1]?.trim() || ''
  const state = parts[2]?.trim() || ''

  return `${line1}<br>${city}, ${state}`
}

function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ==============================
// ⛪ CHURCH LOCATION
// ==============================
const churchLat = 32.9027
const churchLng = -96.5639
const churchAddress = "5001 Main St, Rowlett, TX 75088"

// ==============================
// 🗺️ MAP INIT
// ==============================
const map = L.map("map").setView([churchLat, churchLng], 12)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map)

L.marker([churchLat, churchLng])
  .addTo(map)
  .bindPopup("Church")
  .openPopup()

// ==============================
// 📦 STATE
// ==============================
let manualOrder = []
let manualMode = false
let routeMode = false   
let pinMarkers = []
let routeLine = null

// ==============================
// 🔄 INITIAL LOAD
// ==============================
loadPins()
loadPendingPickupCount()

setInterval(() => {
  if (!routeMode) {
    loadPins()
    loadPendingPickupCount()
  }
}, 10000)


// ==============================
// 📍 LOAD PINS
// ==============================
async function loadPins() {
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

    if (distanceMiles(churchLat, churchLng, Number(row.lat), Number(row.lng)) <= 0.15) return

    const marker = L.marker([row.lat, row.lng]).addTo(map)
    pinMarkers.push(marker)

    // manual route click
    marker.on("click", () => {
      if (manualMode) {
        manualOrder.push({ lat: row.lat, lng: row.lng })
        alert(`Added stop #${manualOrder.length}`)
      }
    })

    // popup (FIXED)
    marker.bindPopup(`
      <b>${row.name}</b><br>
      ${formatAddress(row.address)}<br><br>

      <button onclick="dropOff('${row.id}')">Drop Off</button><br><br>

      <button onclick="deleteRider('${row.id}')"
        style="background:#dc3545;color:white;padding:8px;border:none;border-radius:6px;">
        Delete
      </button>
    `)
  })
}


// ==============================
// 🔢 COUNT
// ==============================
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


// ==============================
// 🚚 DROP OFF
// ==============================
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


// ==============================
// ❌ DELETE RIDER
// ==============================
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

  loadPins()
  loadPendingPickupCount()
}

// ==============================
// ⚡ ACTIONS (USER EVENTS)
// ==============================
function toggleManualMode() {
  manualMode = !manualMode

  if (manualMode) {
    manualOrder = []
    alert("Manual mode ON: Click stops in order")
  } else {
    alert("Manual mode OFF")
  }
}


// ==============================
// 🛣️ DRAW ROUTE (MAP)
// ==============================
async function drawRoute() {
  console.log("DRAW ROUTE CLICKED")

  routeMode = true

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

  // ✅ IMPORTANT: DO NOT pre-sort (let OSRM optimize)
  const routeCoords = [
    `${churchLng},${churchLat}`,
    ...stops.map(x => `${x.lng},${x.lat}`)
  ].join(";")

  const url = `https://router.project-osrm.org/trip/v1/driving/${routeCoords}?overview=full&geometries=geojson&source=first&roundtrip=false`

  const res = await fetch(url)
  const json = await res.json()

  if (!json.trips || !json.trips.length) {
    alert("No route found")
    return
  }

  const orderedStops = json.waypoints.slice(1)

  // clear markers
  pinMarkers.forEach(m => map.removeLayer(m))
  pinMarkers = []

  // numbered markers
  orderedStops.forEach((wp, index) => {
    const lat = wp.location[1]
    const lng = wp.location[0]

    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background:#2563eb;
            color:white;
            border-radius:50%;
            width:28px;
            height:28px;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:bold;
          ">
            ${index + 1}
          </div>
        `
      })
    }).addTo(map)

    pinMarkers.push(marker)
  })

  if (routeLine) {
    map.removeLayer(routeLine)
  }

  routeLine = L.geoJSON(json.trips[0].geometry, {
    style: {
      color: "blue",
      weight: 4
    }
  }).addTo(map)

  map.fitBounds(routeLine.getBounds(), { padding: [30, 30] })
}

// ==============================
// 🌍 OPEN IN GOOGLE MAPS
// ==============================
async function openInGoogle() {
  const { data, error } = await db
    .from("pickup_addresses")
    .select("address")
    .eq("status", "pending")

  if (error || !data || data.length === 0) {
    alert("No stops for Google Maps")
    return
  }

  const stops = data
    .map(x => x.address?.trim())
    .filter(x => x && x.length > 0)

  const origin = encodeURIComponent(churchAddress)
  const destination = encodeURIComponent(churchAddress)

  const waypointString = stops.join("|")
  const waypoints = encodeURIComponent(waypointString)

  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin}` +
    `&destination=${destination}` +
    `&travelmode=driving` +
    `&waypoints=${waypoints}`

  window.open(url, "_blank")
}
