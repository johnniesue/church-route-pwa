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

const { data } = await db
.from("pickup_addresses")
.select("name,address")

data.forEach(async row=>{

const geo = await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(row.address)}`
)

const geoData = await geo.json()

if(!geoData.length) return

const lat = geoData[0].lat
const lon = geoData[0].lon

L.marker([lat,lon])
.addTo(map)
.bindPopup(`${row.name}<br>${row.address}`)

})

}

async function buildRoute(){

const { data } = await db
.from("pickup_addresses")
.select("address")

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
