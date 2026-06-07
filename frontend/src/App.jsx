import { useState } from "react"
import './App.css'
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

function PaymentForm({ post, fare, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()

  const handlePay = async () => {
    const response = await fetch(`${API}/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(fare), post_id: post.id })
    })
    const { client_secret } = await response.json()
    const result = await stripe.confirmCardPayment(client_secret, {
      payment_method: { card: elements.getElement(CardElement) }
    })
    if (result.error) {
      alert(result.error.message)
    } else {
      onSuccess()
    }
  }

  return (
    <div>
      <div style={{border:"1px solid #e0e0e0",borderRadius:"8px",padding:"12px",marginBottom:"16px"}}>
        <CardElement />
      </div>
      <button className="submit-btn" onClick={handlePay}>Pay ${fare}</button>
      <p style={{textAlign:"center",marginTop:"12px",fontSize:"13px",color:"#bbb",cursor:"pointer"}} onClick={onCancel}>Cancel</p>
    </div>
  )
}

function App() {
  const [view, setView] = useState("home")
  const [destination, setDestination] = useState("")
  const [posts, setPosts] = useState([])
  const [tripTypeFilter, setTripTypeFilter] = useState("")
  const [token, setToken] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState("login")
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" })
  const [userLocation, setUserLocation] = useState(null)
  const [myTrips, setMyTrips] = useState([])
  const [myPostRequests, setMyPostRequests] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [ratedTrips, setRatedTrips] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [chatRequestId, setChatRequestId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState("")
  const [chatSocket, setChatSocket] = useState(null)

const fetchMyPostRequests = async () => {
  const response = await fetch(`${API}/my-post-requests/${currentUser}`)
  const data = await response.json()
  setMyPostRequests(data)
  setView("post-requests")
}

const fetchProfile = async () => {
  const response = await fetch(`${API}/profile/${currentUser}`)
  const data = await response.json()
  setUserProfile(data)
  setView("profile")
}

const acceptRequest = async (requestId) => {
  const response = await fetch(`${API}/requests/${requestId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "accepted" })
  })
  const data = await response.json()
  if (data.id) {
    fetchMyPostRequests()
  }
}

const [newPost, setNewPost] = useState({
  user_id: "",
  destination: "",
  departure_time: "",
  trip_type: "both",
  available_slots: 1
})

const searchPosts = async () => {
  const response = await fetch(`${API}/posts?destination=${destination}`)
  const data = await response.json()
  setPosts(data)
  setView("results")
  
  navigator.geolocation.getCurrentPosition((pos) => {
    setUserLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    })
  })
}

const createPost = async () => {
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const response = await fetch(`${API}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newPost,
        user_id: currentUser,
        start_lat: pos.coords.latitude,
        start_lng: pos.coords.longitude
      })
    })
    const data = await response.json()
    if (data.id) {
      alert("Post created!")
      setView("home")
    } else {
      alert("Error: " + JSON.stringify(data))
    }
  })
}

const handleAuth = async () => {
  const url = authMode === "login" ? "/login" : "/signup"
  const response = await fetch(`${API}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authForm)
  })
  const data = await response.json()
  if (data.token) {
    setToken(data.token)
    setCurrentUser(data.user_id)
    setShowAuth(false)
    setNewPost({...newPost, user_id: data.user_id})
  } else {
    alert("Error: " + JSON.stringify(data))
  }
}

const requestSpot = async (postId) => {
  if (!currentUser) {
    setAuthMode("login")
    setShowAuth(true)
    return
  }
  const response = await fetch(`${API}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      post_id: postId,
      requester_id: currentUser,
      request_type: tripTypeFilter || "ride",
      details: "Requested via app"
    })
  })
  const data = await response.json()
  if (data.id) {
    alert("Request sent!")
  } else {
    alert("Error: " + JSON.stringify(data))
  }
}

const calculateFare = (lat1, lng1, lat2, lng2) => {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const miles = R * c
  const baseFare = 2.00  
  const perMile = 1.00
  return (baseFare + miles * perMile).toFixed(2)
}

const fetchMyTrips = async () => {
  const response = await fetch(`${API}/my-trips/${currentUser}`)
  const data = await response.json()
  setMyTrips(data)
  setView("trips")
}

const submitRating = async (tripRequestId, score, posterId) => {
  const response = await fetch(`${API}/ratings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trip_request_id: tripRequestId,
      rater_id: currentUser,
      rated_id: posterId,
      score: score
    })
  })
  const data = await response.json()
  if (data.id) {
    setRatedTrips([...ratedTrips, tripRequestId])
    alert("Rating submitted!")
  }
}

const openChat = (requestId) => {
  if (chatSocket) chatSocket.close()
  setChatRequestId(requestId)
  setMessages([])
  setView("chat")
  
  const wsUrl = API.replace('https', 'wss').replace('http', 'ws')
  const ws = new WebSocket(`${wsUrl}/chat/${requestId}/${currentUser}`)
  
  ws.onopen = () => {
    console.log("WebSocket connected")
  }
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    setMessages(prev => [...prev, msg])
  }
  
  ws.onerror = (error) => {
    console.log("WebSocket error:", error)
  }
  
  ws.onclose = () => {
    console.log("WebSocket closed")
  }
  
  setChatSocket(ws)
}

const sendMessage = () => {
  if (!messageInput.trim() || !chatSocket) return
  chatSocket.send(JSON.stringify({ content: messageInput }))
  setMessageInput("")
}

  return (
  <div>
    {view === "home" && (
      <>
        <nav>
          <div className="logo">tagalong</div>
          <div className="nav-links">
            <span className="nav-link">How it works</span>
            <span className="nav-link">Safety</span>
          </div>
          <div className="nav-right">
            {currentUser ? (
              <div style={{display:"flex", gap:"16px", alignItems:"center"}}>
                <span style={{fontSize:"13px", cursor:"pointer", color:"#555"}} onClick={fetchMyTrips}>My trips</span>
                <span style={{fontSize:"13px", cursor:"pointer", color:"#555"}} onClick={fetchMyPostRequests}>Requests</span>
                <span style={{fontSize:"13px", cursor:"pointer", color:"#555"}} onClick={fetchProfile}>👤 Profile</span>
              </div>
            ) : (
              <>
                <button className="nav-btn nav-outline" onClick={() => { setAuthMode("login"); setShowAuth(true) }}>Sign in</button>
                <button className="nav-btn nav-solid" onClick={() => { setAuthMode("signup"); setShowAuth(true) }}>Get started</button>
              </>
            )}
          </div>
        </nav>

        <div className="home-body">
          <div className="home-left">
            <div className="eyebrow">Hyperlocal sharing</div>
            <div className="home-title">Go<br />together.</div>

            <div className="input-stack">
              <div className="input-row">
                <div className="input-dot-filled"></div>
                <input
                  className="input-placeholder"
                  placeholder="Where are you headed?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchPosts()}
                />
              </div>
              <div className="connector"></div>
              <div className="input-row">
                <div className="input-dot-empty"></div>
                <select
                  className="input-placeholder"
                  value={tripTypeFilter}
                  onChange={(e) => setTripTypeFilter(e.target.value)}
                  style={{cursor: "pointer", appearance: "none"}}
                >
                  <option value="">Ride or errand pickup?</option>
                  <option value="ride">Ride</option>
                  <option value="pickup">Errand pickup</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            <button className="go-btn" onClick={searchPosts}>Find a tagalong →</button>

            <div className="divider">
              <div className="div-line"></div>
              <span className="div-text">or</span>
              <div className="div-line"></div>
            </div>

            <button className="offer-btn" onClick={() => {
              if (!currentUser) {
                setAuthMode("signup")
                setShowAuth(true)
              } else {
                setView("create")
              }
            }}>Offer a ride or errand</button>
          </div>

          <div className="home-right">
            <div className="road-h"></div>
            <div className="road-v"></div>
            <div className="dash-h"></div>
            <div className="dash-v"></div>

            <div className="tree" style={{width:"32px",height:"32px",top:"12%",left:"18%"}}></div>
            <div className="tree" style={{width:"24px",height:"24px",top:"18%",left:"62%"}}></div>
            <div className="tree" style={{width:"40px",height:"40px",top:"68%",left:"14%"}}></div>
            <div className="tree" style={{width:"28px",height:"28px",top:"72%",left:"66%"}}></div>
            <div className="tree" style={{width:"20px",height:"20px",top:"35%",left:"75%"}}></div>
            <div className="tree" style={{width:"36px",height:"36px",top:"55%",left:"8%"}}></div>

            <div className="map-pin" style={{top:"22%",left:"30%"}}>
              <div className="pin-circle" style={{background:"#111"}}>🛒</div>
              <div className="pin-tail"></div>
              <div className="pin-label">Costco</div>
            </div>

            <div className="map-pin" style={{top:"55%",left:"52%"}}>
              <div className="pin-circle" style={{background:"#fff",border:"2px solid #111"}}>🚗</div>
              <div className="pin-tail"></div>
              <div className="pin-label">Jamie · 2 seats</div>
            </div>

            <div className="float-card" style={{bottom:"22%",left:"6%"}}>
              <div className="float-card-name">Priya</div>
              <div className="float-card-sub">Walmart · leaves at 3pm</div>
              <span className="pill pill-green">1 slot left</span>
            </div>

            <div className="float-card" style={{top:"10%",right:"5%"}}>
              <div className="float-card-name">Marcus</div>
              <div className="float-card-sub">Target · picks up 3 items</div>
              <span className="pill pill-gray">Errand only</span>
            </div>

            <div className="float-card" style={{top:"48%",right:"4%"}}>
              <div className="float-card-name">3 going to Airport</div>
              <div className="float-card-sub">Next departure in 40 min</div>
              <span className="pill pill-green">Spots open</span>
            </div>
          </div>
        </div>
      </>
    )}

    {view === "find" && (
      <div className="page">
        <button className="back-btn" onClick={() => setView("home")}>← Back</button>
        <div className="page-title">Find a tagalong</div>
        <div className="find-search">
          <input
            type="text"
            placeholder="Where do you need to go?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchPosts()}
          />
          <button onClick={searchPosts}>Search</button>
        </div>
      </div>
    )}

    {view === "results" && (
      <div className="page">
        <button className="back-btn" onClick={() => setView("home")}>← Back</button>
        <div className="page-title">Heading to {destination}</div>
        {posts.length === 0 && <p style={{color:"#888",fontSize:"14px"}}>No tagalongs found for this destination.</p>}
        {posts.map(post => (
          <div key={post.id} className="post-card">
            <div className="post-card-top">
              <span className="post-card-name">{post.trip_type === "both" ? "Rides + Pickups" : post.trip_type}</span>
              <span className="pill pill-gray">{post.available_slots} slot{post.available_slots !== 1 ? "s" : ""} left</span>
            </div>
            <div className="post-card-detail">Departing {post.departure_time}</div>
              {userLocation && post.start_lat && (
                <div style={{fontSize:"15px", fontWeight:"600", color:"#0ACF83", marginBottom:"12px"}}>
                  Est. fare: ${calculateFare(userLocation.lat, userLocation.lng, post.start_lat, post.start_lng)}
                </div>
              )}
            <button className="request-btn" onClick={() => {
              if (!currentUser) {
                setAuthMode("login")
                setShowAuth(true)
                return
              }
              setSelectedPost(post)
              setShowPayment(true)
            }}>
              Request a spot
            </button>
          </div>
        ))}
      </div>
    )}

    {view === "create" && (
      <div className="page">
        <button className="back-btn" onClick={() => setView("home")}>← Back</button>
        <div className="page-title">Post a trip</div>
        <div className="form-group">
          <label className="form-label">Destination</label>
          <input className="form-input" placeholder="e.g. Costco, Walmart, Airport" value={newPost.destination}
            onChange={(e) => setNewPost({...newPost, destination: e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Departure Time</label>
          <input className="form-input" placeholder="e.g. 2026-06-07 15:00:00" value={newPost.departure_time}
            onChange={(e) => setNewPost({...newPost, departure_time: e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Trip Type</label>
          <select className="form-input" value={newPost.trip_type}
            onChange={(e) => setNewPost({...newPost, trip_type: e.target.value})}>
            <option value="both">Rides + Pickups</option>
            <option value="pickup">Pickup only</option>
            <option value="ride">Ride only</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Available Slots</label>
          <input className="form-input" type="number" value={newPost.available_slots}
            onChange={(e) => setNewPost({...newPost, available_slots: parseInt(e.target.value)})} />
        </div>
        <button className="submit-btn" onClick={createPost}>Post trip</button>
      </div>
      
    )}
    {view === "trips" && (
  <div className="page">
    <button className="back-btn" onClick={() => setView("home")}>← Back</button>
    <div className="page-title">My trips</div>
    {myTrips.length === 0 && <p style={{color:"#888",fontSize:"14px"}}>No trips yet.</p>}
    {myTrips.map(trip => (
      <div key={trip.id} className="post-card">
        <div className="post-card-top">
          <span className="post-card-name">{trip.destination}</span>
          <span className={`pill ${trip.status === "accepted" ? "pill-green" : "pill-gray"}`}>
            {trip.status}
          </span>
        </div>
        <div className="post-card-detail">{trip.request_type} · Departing {trip.departure_time}</div>
        <div style={{fontSize:"12px",color:"#bbb",marginTop:"8px"}}>Requested {trip.created_at}</div>
        {trip.status === "accepted" && !trip.already_rated && (
          <div style={{marginTop:"12px"}}>
            <p style={{fontSize:"13px",color:"#555",marginBottom:"8px",textAlign:"center"}}>Rate your experience:</p>
            <div style={{display:"flex",gap:"8px",justifyContent:"center"}}>
              {[1,2,3,4,5].map(star => (
                <span key={star} style={{fontSize:"24px",cursor:"pointer",opacity: star <= hoveredStar ? 1 : 0.3}}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => submitRating(trip.id, star, trip.poster_id)}>
                  ⭐
                </span>

              ))}
            </div>
          </div>
        )}
        {trip.status === "accepted" && ratedTrips.includes(trip.id) && (
          <p style={{fontSize:"13px",color:"#0ACF83",marginTop:"12px",textAlign:"center"}}>✓ Rated</p>
        )}
        {trip.status === "accepted" && (
          <button className="back-btn" style={{marginTop:"8px",width:"100%",justifyContent:"center"}} onClick={() => openChat(trip.id)}>
            💬 Open chat
          </button>
        )}
      </div>
    ))}
  </div>
)}
  {view === "post-requests" && (
  <div className="page">
    <button className="back-btn" onClick={() => setView("home")}>← Back</button>
    <div className="page-title">Incoming requests</div>
    {myPostRequests.length === 0 && <p style={{color:"#888",fontSize:"14px"}}>No requests yet.</p>}
    {myPostRequests.map(req => (
      <div key={req.id} className="post-card">
        <div className="post-card-top">
          <span className="post-card-name">{req.destination}</span>
          <span className={`pill ${req.status === "accepted" ? "pill-green" : "pill-gray"}`}>
            {req.status}
          </span>
        </div>
        <div className="post-card-detail">{req.request_type} · Departing {req.departure_time}</div>
        {req.status === "pending" && (
          <button className="request-btn" style={{marginTop:"12px"}} onClick={() => acceptRequest(req.id)}>
            Accept
          </button>
        )}
      </div>
    ))}
  </div>
)}
{view === "profile" && userProfile && (
  <div className="page">
    <button className="back-btn" onClick={() => setView("home")}>← Back</button>
    <div className="page-title">My profile</div>
    <div className="post-card" style={{textAlign:"center",padding:"32px"}}>
      <div style={{width:"64px",height:"64px",borderRadius:"50%",background:"#0ACF83",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:"24px",fontWeight:"700",color:"#fff"}}>
        {userProfile.name[0].toUpperCase()}
      </div>
      <div style={{fontSize:"20px",fontWeight:"700",marginBottom:"4px"}}>{userProfile.name}</div>
      <div style={{fontSize:"13px",color:"#888",marginBottom:"24px"}}>{userProfile.email}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"16px"}}>
        <div style={{background:"#f7f7f7",borderRadius:"12px",padding:"16px"}}>
          <div style={{fontSize:"22px",fontWeight:"700",color:"#0ACF83"}}>{userProfile.average_rating || "—"}</div>
          <div style={{fontSize:"12px",color:"#888"}}>Avg rating</div>
        </div>
        <div style={{background:"#f7f7f7",borderRadius:"12px",padding:"16px"}}>
          <div style={{fontSize:"22px",fontWeight:"700",color:"#111"}}>{userProfile.rating_count}</div>
          <div style={{fontSize:"12px",color:"#888"}}>Ratings</div>
        </div>
        <div style={{background:"#f7f7f7",borderRadius:"12px",padding:"16px"}}>
          <div style={{fontSize:"22px",fontWeight:"700",color:"#111"}}>{userProfile.trip_count}</div>
          <div style={{fontSize:"12px",color:"#888"}}>Trips</div>
        </div>
      </div>
      <div style={{fontSize:"12px",color:"#bbb",marginTop:"24px"}}>Member since {userProfile.member_since.split(" ")[0]}</div>
    </div>
  </div>
)}
{showPayment && selectedPost && (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
    <div style={{background:"#fff",borderRadius:"16px",padding:"40px",width:"100%",maxWidth:"400px"}}>
      <h2 style={{fontSize:"22px",fontWeight:"700",marginBottom:"8px"}}>Confirm your spot</h2>
      <p style={{fontSize:"13px",color:"#888",marginBottom:"8px"}}>Heading to {selectedPost.destination}</p>
      {userLocation && selectedPost.start_lat && (
        <p style={{fontSize:"24px",fontWeight:"700",color:"#0ACF83",marginBottom:"24px"}}>
          ${calculateFare(userLocation.lat, userLocation.lng, selectedPost.start_lat, selectedPost.start_lng)}
        </p>
      )}
      <p style={{fontSize:"13px",color:"#888",marginBottom:"24px"}}>Enter your card details to hold payment.</p>
      <Elements stripe={stripePromise}>
        <PaymentForm
          post={selectedPost}
          fare={userLocation && selectedPost.start_lat ? calculateFare(userLocation.lat, userLocation.lng, selectedPost.start_lat, selectedPost.start_lng) : "2.00"}
          onSuccess={async () => {
            await requestSpot(selectedPost.id)
            setShowPayment(false)
            setSelectedPost(null)
          }}
          onCancel={() => { setShowPayment(false); setSelectedPost(null) }}
        />
      </Elements>
    </div>
  </div>
)}
    {showAuth && (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
    <div style={{background:"#fff",borderRadius:"16px",padding:"40px",width:"100%",maxWidth:"400px"}}>
      <h2 style={{fontSize:"22px",fontWeight:"700",marginBottom:"8px"}}>
        {authMode === "login" ? "Welcome back" : "Create account"}
      </h2>
      <p style={{fontSize:"13px",color:"#888",marginBottom:"24px"}}>
        {authMode === "login" ? "Sign in to your account" : "Join the Tagalong community"}
      </p>

      {authMode === "signup" && (
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" placeholder="Your name"
            value={authForm.name}
            onChange={(e) => setAuthForm({...authForm, name: e.target.value})} />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" type="email" placeholder="you@example.com"
          value={authForm.email}
          onChange={(e) => setAuthForm({...authForm, email: e.target.value})} />
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <input className="form-input" type="password" placeholder="••••••••"
          value={authForm.password}
          onChange={(e) => setAuthForm({...authForm, password: e.target.value})} />
      </div>

      <button className="submit-btn" onClick={handleAuth}>
        {authMode === "login" ? "Sign in" : "Create account"}
      </button>

      <p style={{textAlign:"center",marginTop:"16px",fontSize:"13px",color:"#888"}}>
        {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
        <span style={{color:"#0ACF83",cursor:"pointer",fontWeight:"600"}}
          onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
          {authMode === "login" ? "Sign up" : "Sign in"}
        </span>
      </p>

      <p style={{textAlign:"center",marginTop:"8px",fontSize:"13px",color:"#bbb",cursor:"pointer"}}
        onClick={() => setShowAuth(false)}>
        Cancel
      </p>
    </div>
  </div>
)}
{view === "chat" && (
  <div className="page">
    <button className="back-btn" onClick={() => { setView("trips"); chatSocket && chatSocket.close() }}>← Back</button>
    <div className="page-title">Chat</div>
    <div style={{border:"1px solid #ebebeb",borderRadius:"12px",height:"400px",overflowY:"auto",padding:"16px",marginBottom:"16px",background:"#fafafa"}}>
      {messages.length === 0 && <p style={{color:"#bbb",fontSize:"13px",textAlign:"center"}}>No messages yet</p>}
      {messages.map((msg, i) => (
        <div key={i} style={{marginBottom:"12px",display:"flex",flexDirection: msg.sender_id === currentUser ? "row-reverse" : "row",gap:"8px"}}>
          <div style={{
            background: msg.sender_id === currentUser ? "#0ACF83" : "#f0f0f0",
            color: msg.sender_id === currentUser ? "#fff" : "#111",
            padding:"10px 14px",borderRadius:"12px",fontSize:"14px",maxWidth:"70%"
          }}>
            {msg.content}
          </div>
        </div>
      ))}
    </div>
    <div style={{display:"flex",gap:"8px"}}>
      <input className="form-input" placeholder="Type a message..."
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        style={{flex:1}} />
      <button className="request-btn" style={{width:"auto",padding:"12px 20px"}} onClick={sendMessage}>Send</button>
    </div>
  </div>
)}
  </div>
)
}


export default App