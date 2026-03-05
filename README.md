# Church Pickup Route Builder 🚐

A simple web app that allows parents to request church van pickup and allows administrators to generate an optimized pickup route.

This project was built as a lightweight Progressive Web App (PWA) using:

- Supabase (database)
- Leaflet (map display)
- OpenStreetMap / Nominatim (address verification)
- Google Maps (route navigation)
- Vercel (hosting)

---

# What This App Does

### Parent Pickup Request Page

Parents can submit a pickup request by entering:

- Name
- Address

The system automatically:

• Suggests verified addresses while typing  
• Ensures the address is within 10 miles of the church  
• Prevents duplicate submissions  
• Stores the pickup location in the database

---

### Admin Route Builder

The admin page shows a live map of all pickup locations.

Features include:

• Live map with pickup pins  
• Automatic refresh every 10 seconds  
• "Drop Off" button for each pickup location  
• Build Route button that generates an optimized route in Google Maps

The route begins and ends at the church.

---

# How It Works

### 1. Parent submits pickup request

Parent enters:

Name
Address


The system:

1. Verifies the address using OpenStreetMap
2. Converts it to latitude / longitude
3. Checks if it is within 10 miles of the church
4. Saves the request to Supabase

---

### 2. Admin views the route board

The admin page loads all pending pickups from the database and displays them on a map.

Each location includes:


Name
Address
Drop Off Button


---

### 3. Build the route

Click **Build Route** to generate an optimized driving route using Google Maps.

The route includes:

Church
Pickup Stops
Return to Church


Google Maps automatically determines the fastest order.

---

# Project Structure

church-route-pwa
│
├── index.html # Parent pickup request form
├── admin.html # Admin map / route builder
├── app.js # Parent page logic
├── admin.js # Admin map logic
├── README.md # Project documentation


---

# Database (Supabase)

Table: `pickup_addresses`

Columns:


id (uuid)
name (text)
address (text)
lat (float)
lng (float)
status (text)
created_at (timestamp)
dropped_at (timestamp)


Status values:


pending
dropped_off


---

# Deployment

Hosted using **Vercel**

Steps:

1. Push repository to GitHub
2. Connect repo to Vercel
3. Deploy automatically

---

# Map Technology

Map rendering uses **Leaflet + OpenStreetMap**.

Address verification uses **Nominatim geocoding**.

Routing is handled by **Google Maps Directions API via URL parameters**.

---

# Future Improvements

Possible enhancements:

• Draw route directly on the map  
• Number pickup stops automatically  
• Real-time pickup status board  
• SMS notifications to parents  
• Driver mobile interface  
• QR code for parents to request pickup

---

# License

Open source for church and community use.
