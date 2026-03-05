const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
)

const churchLat = 32.9027
const churchLng = -96.5639

const map = L.map("map").setView([churchLat, churchLng], 12)

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { maxZoom: 19 }
).addTo(map)

L.marker([churchLat, churchLng])
  .addTo(map)
  .bindPopup("Church")
  .openPopup()

let pinMarkers = []

loadPins()
setInterval(loadPins, 10000)

async function loadPins(){

  // remove old pins
  pinMarkers.forEach(m => map.removeLayer(m))
  pinMarkers = []

  const { data, error } = await db
    .from("pickup_addresses")
    .select("id,name,address,lat,lng")
    .eq("status","pending")

  if (error || !data) return

  data.forEach(row => {

    if (row.lat == null || row.lng == null) return

    const marker = L.marker([row.lat, row.lng]).addTo(map)
    pinMarkers.push(marker)

    marker.bindPopup(`
      <b>${row.name}</b><br>
      ${row.address}<br><br>
      <button onclick="dropOff('${row.id}')">
        Drop Off
      </button>
    `)
  })
}

async function buildRoute(){

  const { data, error } = await db
    .from("pickup_addresses")
    .select("lat,lng")
    .eq("status","pending")

  if(error){
    console.error(error)
    alert("Error loading stops")
    return
  }

  if(!data || data.length === 0){
    alert("No pending stops")
    return
  }

  const church = "32.9027,-96.5639"

  let waypoints = data
    .map(x => `${x.lat},${x.lng}`)
    .join("|")

  const url =
`https://www.google.com/maps/dir/?api=1&origin=${church}&destination=${church}&travelmode=driving&waypoints=${waypoints}`

  window.open(url, "_blank")
}
