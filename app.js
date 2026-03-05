const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
)

document
.getElementById("pickupForm")
.addEventListener("submit", async (e) => {

e.preventDefault()

const name =
document.getElementById("name").value

const address =
document.getElementById("address").value

await supabase
.from("pickup_addresses")
.insert([
{
name: name,
address: address
}
])

alert("Pickup request sent!")

document.getElementById("pickupForm").reset()

})
