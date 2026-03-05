const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const db = supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
)

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
&waypoints=${waypoints}
&travelmode=driving`

window.open(url)

}
