// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String },
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: [Number]
    }
  },
  rating: { type: Number, default: 0 },
  joinedDate: { type: Date, default: Date.now },
  avatar: String,
  verifiedUser: { type: Boolean, default: false }
}, { timestamps: true });

// models/Listing.js
const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'] },
  images: [String],
  location: {
    address: String,
    city: { type: String, required: true },
    state: String,
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: [Number]
    }
  },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'sold', 'suspended'], default: 'active' },
  views: { type: Number, default: 0 },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [String],
  negotiable: { type: Boolean, default: false }
}, { timestamps: true });

// models/Message.js
const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// models/Conversation.js
const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// API Routes Structure
const express = require('express');
const router = express.Router();

// Listings Routes
router.get('/listings', async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice, condition, sort } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = minPrice;
      if (maxPrice) query.price.$lte = maxPrice;
    }

    const listings = await Listing.find(query)
      .populate('seller', 'username rating avatar')
      .sort(sort || '-createdAt');

    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/listings', auth, async (req, res) => {
  try {
    const listing = new Listing({
      ...req.body,
      seller: req.user._id
    });
    await listing.save();
    res.status(201).json(listing);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Messages Routes
router.post('/messages', auth, async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      content,
      readBy: [req.user._id]
    });
    await message.save();
    
    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Search Middleware
const searchMiddleware = async (req, res, next) => {
  const { q } = req.query;
  if (q) {
    req.searchQuery = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    };
  }
  next();
};
