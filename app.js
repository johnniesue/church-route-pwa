const SUPABASE_URL = "PASTE_SUPABASE_URL"
const SUPABASE_KEY = "PASTE_SUPABASE_ANON_KEY"

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
