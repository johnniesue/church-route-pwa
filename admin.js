const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const db = supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
)

const churchLat = 32.9027
const churchLng = -96.5639

const map = L.map("map").setView(
[churchLat,churchLng],
12
)

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
maxZoom:19
}
).addTo(map)

L.marker([churchLat,churchLng])
.addTo(map)
.bindPopup("Church")
.openPopup()

loadPins()

async function loadPins(){

  const { data, error } = await db
    .from("pickup_addresses")
    .select("id,name,address,lat,lng")
    .eq("status","pending")

  if (error || !data) return

  data.forEach(row => {

    if (row.lat == null || row.lng == null) return

    const marker = L.marker([row.lat, row.lng]).addTo(map)

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
.select("address")
.eq("status","pending")

if(error || !data || data.length === 0){
alert("No pending stops")
return
}

let stops = data.map(x =>
encodeURIComponent(x.address)
)

let waypoints = stops.join("|")

let church =
encodeURIComponent(
"5001 Main St, Rowlett, TX 75088"
)

let url =
`https://www.google.com/maps/dir/?api=1
&origin=${church}
&destination=${church}
&waypoints=optimize:true|${waypoints}
&travelmode=driving`

window.open(url)

}

async function dropOff(id){

await db
.from("pickup_addresses")
.update({
status: "dropped_off",
dropped_at: new Date()
})
.eq("id", id)

location.reload()

}
