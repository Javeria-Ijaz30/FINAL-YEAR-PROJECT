const express = require('express');
const mongoose = require('mongoose');  // Ensure this is only declared once
const bcrypt = require('bcrypt');
const cors = require("cors");
const jwt = require('jsonwebtoken');
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth2");
const User = require('./Schemas/userSchemaModel');
const Tour =require('./Schemas/tourSchemaModel') 
const nodemailer = require('nodemailer');
const translateRoute = require('./routes/translate'); // Adjust path if needed
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use('/translate', translateRoute);

// Connect to MongoDB
mongoose.connect(process.env.DB_URL)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// JWT Secret key
const JWT_SECRET = "sadaaad"; // Replace with a strong secret key

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    scope: ['profile', 'email'],  // This requests access to the user's profile and email
    passReqToCallback: true,
}, async (request, accessToken, refreshToken, profile, done) => {
    try {
        // Check if the user already exists
        let user = await User.findOne({ email: profile.email });
        
        if (!user) {
            // If user doesn't exist, create a new one
            user = new User({
                email: profile.email,
                name: profile.displayName,
                password: "", // Leave password blank for OAuth users
                role: 0
            });
            await user.save();
        }
        
        // Return the user to the next middleware
        done(null, user);
    } catch (error) {
        done(error, null);
    }
}));

// Serialize and deserialize user (not necessary for JWT, but Passport requires it)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user));
});

// Google OAuth login route
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback route
app.get('/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    try {
        const token = jwt.sign(
            { email: req.user.email, role: req.user.role },
            JWT_SECRET,
            { expiresIn: '10d' }
        );

        // Redirect the user to frontend with token, user info, and role
        const userInfo = {
            _id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role  // Add role here
        };

        res.redirect(`http://localhost:5173/welcome?token=${token}&user=${encodeURIComponent(JSON.stringify(userInfo))}`);

    } catch (error) {
        // In case of error, redirect to frontend with error message
        console.error('Error during Google OAuth callback:', error);
        res.redirect(`http://localhost:3000/error?message=${encodeURIComponent('Failed to authenticate with Google. Please try again.')}`);
    }
});

// Merged Signup Route (does not generate token)
app.post("/signup", async (req, res) => {
    const { email, password, name } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        // Generate a unique 4-digit verification code
        const verificationCode = Math.floor(1000 + Math.random() * 9000);
        console.log(password)
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user object with the verification code
        const newUser = new User({
            email,
            password: hashedPassword,
            name,
            role: 0, // Default role for a new user (you can modify this if needed)
            verificationCode, // Store the generated verification code in the user document
        });

        // Save the new user to the database
        await newUser.save();

        // Send the verification code via email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            secure:true,
            port:465,
            auth: {
                user: 'intelligenttourguidefyp@gmail.com', // Your Gmail address (use environment variables for better security)
                pass: 'tgzlbnvzglrvbtnm',   // Your Gmail password or App Password
            },
        });

        const mailOptions = {
            from: 'intelligenttourguidefyp@gmail.com', // Sender's email
            to: email,                    // Recipient's email (the user's email)
            subject: 'Your Verification Code For Intelligent Tour Guide',
            text: `Your verification code is: ${verificationCode}`,
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ message: 'Error sending email' });
            }

            // Send back the response with user info and a success message
            res.status(201).json({
                message: 'Signup successful. Verification code sent to email.',
                email: email, // You can include the email here or omit this if not needed
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error registering user');
    }
});

app.post("/verify-code", async (req, res) => {
    const { email, code } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Check if the verification code matches the one stored in the database
        if (user.verificationCode !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Code is correct, now remove the verification code
        user.verificationCode = undefined;  // Remove the verification code after successful verification
        await user.save(); // Save the updated user (with verification code removed)

        // Create a JWT token after successful verification
        const token = jwt.sign(
            { email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '10d' } // Token expiration time
        );

        // Respond with the JWT token
        res.status(200).json({
            message: 'Verification successful!',
            token,
            user: { _id: user._id, email: user.email, name: user.name,role:user.role},
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error during verification' });
    }
});
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token using your method
    const token = jwt.sign(
      { email: user.email, role: user.role }, // Payload with email and role
      JWT_SECRET, // JWT secret (stored securely)
      { expiresIn: "10d" } // Token expiration (10 days)
    );

    // Send the user data and token back in the response
    res.status(200).json({
      message: "Login successful",
      user,
      token, // The generated JWT token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/uploadGuideFiles", async (req, res) => {
  console.log("here");
  try {
    const { email, guideImageId, cnicImageId, message, address } = req.body;

    // Check if all required data is present
    if (!guideImageId || !cnicImageId || !message || !email || !address) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields." });
    }

    // Find the user by userId
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Update the user's schema with the new values
    user.guideImageId = guideImageId;
    user.cnicImageId = cnicImageId;
    user.message = message;
    user.address = address;
    user.role = 0; //
    user.tourGuideRequestStatus = "APPLIED";
    // Save the updated user
    await user.save();

    // Respond with the updated user object
    const updatedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      cnicImageId: user.cnicImageId,
      guideImageId: user.guideImageId,
      role: user.role,
      tourGuideRequestStatus: user.tourGuideRequestStatus
    };
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred during the update process." });
  }
});

app.post("/uploadPreferences", async (req, res) => {
  const { email, country, phone, food, places } = req.body;

  try {
    // Find the user by email
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's preferences fields
    user.preferences.country = country;
    user.preferences.phone = phone;
    user.preferences.food = food;
    user.preferences.places = places;

    // Save the updated user document
    await user.save();

    return res
      .status(200)
      .json({ message: "Preferences updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});
app.get("/getGuideApplications", async (req, res) => {
  try {
    // Fetch all users where guideImageId exists, excluding preferences
    const users = await User.find({
      tourGuideRequestStatus: { $eq: "APPLIED" },
      role: { $ne: 1 },
      rejected:{$ne:true}
    }).select("-preferences"); // Exclude the preferences field

    if (users.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching guide applications:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});
app.get("/getAllUsers", async (req, res) => {
  try {
    const users = await User.find({ role: { $lt: 2 } });

    if (users.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching guide applications:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});
app.get("/getAllGuides", async (req, res) => {
  try {
    const users = await User.find({ role:1});

    if (users.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching guide applications:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

app.put("/updateUser/:userId", async (req, res) => {
  const { userId } = req.params;
  const updatedData = req.body; // The updated user data passed in the request body

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    Object.keys(updatedData).forEach((key) => {
      user[key] = updatedData[key];
    });

    // Save the updated user document
    const updatedUser = await user.save();
    console.log("user updated!")
    return res.status(200).json({
      message: "User updated successfully",
      updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating user" });
  }
});

app.delete("/deleteUser/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user by ID and delete them
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User deleted successfully",
      deletedUser: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deleting user" });
  }
});


app.post("/acceptGuideRequest", async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user and update the role
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: 1,tourGuideRequestStatus:"APPROVED" }, // Update role to 1
      { new: true } 
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User role updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.post("/rejectGuideRequest", async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user and update the role
    console.log(userId)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { tourGuideRequestStatus:"REJECTED" }, // Update role to 1
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User role updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/getUser", async (req, res) => {
  try {
    console.log("req.query", req.query); // Debugging log
    const user1 = await User.findById(req.query.id);
    console.log("user1", user1);

    const user = await User.findById(req.query.id).select({
      id: 1,
      email: 1,
      role: 1,
      name: 1,
      tourGuideRequestStatus: 1
    });

    console.log("user", user);
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});






app.post("/tours/create", async (req, res) => {
  try {
    const tour = new Tour(req.body);
    const savedTour = await tour.save();
    res.status(201).json(savedTour);
  } catch (error) {
    res.status(400).json({ message: "Error creating tour", error });
  }
});

// 🟡 Get All Tours by Guide
app.get("/tours/guide/:guideId", async (req, res) => {
  try {
    const tours = await Tour.find({ guide: req.params.guideId });
    res.json(tours);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tours" });
  }
});

// 🟡 Get Single Tour by ID
app.get("/tours/details/:tourId", async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ message: "Tour not found" });
    res.json(tour);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tour" });
  }
});

// 🟡 Update Tour
app.put("/tours/update/:tourId", async (req, res) => {
  try {
    const updatedTour = await Tour.findByIdAndUpdate(
      req.params.tourId,
      req.body,
      { new: true }
    );
    res.json(updatedTour);
  } catch (error) {
    res.status(400).json({ message: "Error updating tour", error });
  }
});

// 🟡 Delete Tour
app.delete("/tours/delete/:tourId", async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.tourId);
    res.json({ message: "Tour deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting tour", error });
  }
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
