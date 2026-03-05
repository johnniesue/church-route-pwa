const SUPABASE_URL = "https://gwoirenrtxneamlzlgrf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2lyZW5ydHhuZWFtbHpsZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzk4OTYsImV4cCI6MjA4ODI1NTg5Nn0.uEnMgMJvlsGW-xyaGBtZ0VWFLi-VKu27P8jI9UN7tUU"

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY

)

const addressInput = document.getElementById("address")
const suggestionsEl = document.getElementById("addressSuggestions")

let selectedSuggestion = null
let lastResults = []
let suggestTimer = null

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

/* FREE AUTOCOMPLETE (Nominatim) */
addressInput.addEventListener("input", () => {
  selectedSuggestion = null

  const q = addressInput.value.trim()
  if (q.length < 5) return

  clearTimeout(suggestTimer)
  suggestTimer = setTimeout(async () => {

    const url =
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5` +
      `&countrycodes=us&viewbox=${-96.65},${32.98},${-96.45},${32.82}&bounded=1` +
      `&q=${encodeURIComponent(q)}`

    const res = await fetch(url, { headers: { "Accept": "application/json" } })
    const data = await res.json()

    lastResults = data

    suggestionsEl.innerHTML = ""
    data.forEach(item => {
      const opt = document.createElement("option")
      opt.value = item.display_name
      suggestionsEl.appendChild(opt)
    })

  }, 350)
})

addressInput.addEventListener("change", () => {
  const val = addressInput.value.trim()
  selectedSuggestion = lastResults.find(x => x.display_name === val) || null
})

document.getElementById("pickupForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const name = document.getElementById("name").value.trim()
  const address = addressInput.value.trim()

  if(!name || !address){
    alert("Please enter your name and address")
    return
  }

  let lat
  let lng

  // if suggestion was selected
  if(selectedSuggestion){
    lat = parseFloat(selectedSuggestion.lat)
    lng = parseFloat(selectedSuggestion.lon)
  }
  else{

    // fallback geocode if user typed full address
    const geo = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    )

    const geoData = await geo.json()

    if(!geoData.length){
      alert("Address not found")
      return
    }

    lat = parseFloat(geoData[0].lat)
    lng = parseFloat(geoData[0].lon)
  }

  // 10-mile check
  const miles = distanceMiles(churchLat, churchLng, lat, lng)

  if(miles > 10){
    alert("Address must be within 10 miles of the church")
    return
  }

  // prevent duplicate
  const { data: existing } = await db
    .from("pickup_addresses")
    .select("id")
    .eq("address", address)

  if(existing && existing.length > 0){
    alert("This address has already been submitted")
    return
  }

  // insert
  const { error } = await db
    .from("pickup_addresses")
    .insert([{ name, address, lat, lng }])

  if(error){
    console.error(error)
    alert("Error saving pickup request")
    return
  }

  alert("Pickup request sent! 🚐")

  document.getElementById("pickupForm").reset()

  selectedSuggestion = null
  lastResults = []
  suggestionsEl.innerHTML = ""
})
