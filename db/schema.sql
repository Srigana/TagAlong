CREATE TABLE users(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    destination VARCHAR(200) NOT NULL,
    departure_time TIMESTAMP DEFAULT NOW(),
    trip_type VARCHAR(20) DEFAULT 'pickup'
         CHECK (trip_type IN ('pickup', 'ride', 'both')),
    available_slots INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'open'
        CHECK(status IN('open', 'full', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE requests(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id),
    requester_id UUID REFERENCES users(id),
    request_type VARCHAR(20) DEFAULT 'pickup'
        CHECK(request_type IN('pickup', 'ride')),
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK(status IN('pending', 'accepted', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'held'
        CHECK(status IN('held', 'released', 'refunded')),
    created_at TIMESTAMP DEFAULT NOW()
);