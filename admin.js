// ==============================
// 🔧 CONFIG / SETUP
// ==============================
const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "YOUR_KEY_HERE"

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ==============================
// 🧱 HELPERS
// ==============================
function formatAddress(address) {
  if (!address) return ""

  const parts = address.split(",")

  const streetNumber = parts[0]?.trim() || ""
  const streetName = parts[1]?.trim() || ""
  const city = parts[2]?.trim() || ""
  const state = parts[4]?.trim() || ""

  return `${streetNumber} ${streetName}<br>${city}, ${state}`
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

// ==============================
// 📦 STATE
// ==============================
let pinMarkers = []

// ==============================
// 🔄 INITIAL LOAD
// ==============================
loadPins()
loadPendingPickupCount()

setInterval(() => {
  loadPins()
  loadPendingPickupCount()
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

    marker.bindPopup(`
      <b>${row.name}</b><br><br>
      ${formatAddress(row.address)}<br><br>
      
      <button onclick="deleteRider('${row.id}')"
        style="background:#dc3545;color:white;padding:8px;border:none;border-radius:6px;">
        Delete Rider
      </button>
    `)

    marker.bindTooltip(
      `<b>${row.name}</b><br>${formatAddress(row.address)}`,
      {
        direction: "top",
        offset: [0, -10]
      }
    )

    pinMarkers.push(marker)
  })
}

// ==============================
// 🔢 COUNT
// ==============================
async function loadPendingPickupCount() {
  const { data, error } = await db
    .from("pickup_addresses")
    .select("name")
    .eq("status", "pending")

  if (error) {
    console.error("pending count error:", error)
    return
  }

  const countEl = document.getElementById("pickupCount")

  if (countEl) countEl.innerText = data?.length ?? 0
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
// 🌍 OPEN IN GOOGLE MAPS (FIXED)
// ==============================
async function buildRoute() {
  const { data, error } = await db
    .from("pickup_addresses")
    .select("address")
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

  // clean addresses
  const stops = data
    .map(x => x.address?.trim())
    .filter(x => x && x.length > 5)

  // remove duplicates
  const uniqueStops = [...new Set(stops)]

  const waypoints = uniqueStops
    .map(addr => encodeURIComponent(addr))
    .join("|")

  const url =
    "https://www.google.com/maps/dir/?api=1" +
    `&origin=${encodeURIComponent(churchAddress)}` +
    `&destination=${encodeURIComponent(churchAddress)}` +
    `&travelmode=driving` +
    `&waypoints=${waypoints}`

  window.open(url, "_blank")
}

// ==============================
// 📘 HELP
// ==============================
function showHelp() {
 alert(`
HOW TO USE:

• Riders are added automatically
• Hover over pins to see details
• Delete riders if needed
• Click "Open in Google" to build route
• Adjust route in Google if needed
`)
}
