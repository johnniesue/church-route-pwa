const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
)

const churchLat = 32.9027
const churchLng = -96.5639

function distanceMiles(lat1, lng1, lat2, lng2){

const R = 3958.8

const dLat = (lat2 - lat1) * Math.PI / 180
const dLng = (lng2 - lng1) * Math.PI / 180

const a =
Math.sin(dLat/2) * Math.sin(dLat/2) +
Math.cos(lat1 * Math.PI/180) *
Math.cos(lat2 * Math.PI/180) *
Math.sin(dLng/2) * Math.sin(dLng/2)

const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

return R * c
}

document
.getElementById("pickupForm")
.addEventListener("submit", async (e) => {

e.preventDefault()

const name =
document.getElementById("name").value.trim()

const address =
document.getElementById("address").value.trim()

if(!name || !address){
alert("Please enter your name and address")
return
}

const geo = await fetch(
`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
)

const geoData = await geo.json()

if(!geoData.length){
alert("Address not found")
return
}

const lat = parseFloat(geoData[0].lat)
const lng = parseFloat(geoData[0].lon)

const miles = distanceMiles(
churchLat,
churchLng,
lat,
lng
)

if(miles > 10){
alert("Address must be within 10 miles of the church")
return
}

/* prevent duplicate address */

const { data: existing } = await db
.from("pickup_addresses")
.select("id")
.eq("address", address)

if(existing && existing.length > 0){
alert("This address has already been submitted")
return
}

await db
.from("pickup_addresses")
.insert([
{
name: name,
address: address,
lat: lat,
lng: lng
}
])
